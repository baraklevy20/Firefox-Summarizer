function getFrequencyList(sentences) {
	var dictionary = {};
	var totalWords = 0;
	
	for (var sentence of sentences) {
		var words = sentence.split(" ");
		for (var word of words) {
			if (!(word in dictionary)) {
				dictionary[word] = 0;
			}
			
			dictionary[word]++;
			totalWords++;
		}
	}
	
	for (var key of Object.keys(dictionary)) {
		dictionary[key] /= totalWords;
	}
	
	return dictionary;
}

// Jaccard distance
function getSentencesIntersectionScore(sentence1, sentence2) {
	var words1 = sentence1.split(" ");
	var words2 = sentence2.split(" ");
	var intersection = words1.filter(x => words2.includes(x));
	return new Set(intersection).size / new Set(words1.concat(words2)).size;
}

function getSentenceFrequencyScore(sentence, frequencyList) {
	var score = 0;
	var words = sentence.split(" ");
	for (var word of words) {
		score += frequencyList[word];
	}
	
	return score / words.length;
}

function getPositionScore(position, numberOfSentences) {
	normalizedPosition = position / numberOfSentences;
	
	if (normalizedPosition <= 0.1) return 1.6;
	
	return 1;
}

function getScores(sentences, frequencyList) {
	sentencesRelations = [[]]
	for (i = 0; i < sentences.length; i++) {
		for (j = 0; j < sentences.length; j++) {
			if (!sentencesRelations[i][j]) {
				sentencesRelations[i][j] = getSentencesIntersectionScore(sentences[i], sentences[j]);
				if (!sentencesRelations[j])
					sentencesRelations[j] = [];
				sentencesRelations[j][i] = sentencesRelations[i][j]
			}
		}
	}
	
	scores = [];
	
	for (i = 0; i < sentences.length; i++) {
		scores[i] = ((0.5 * sentencesRelations[i].reduce((partial_sum, a) => partial_sum + a) / sentences.length +
					0.5 * getSentenceFrequencyScore(sentences[i], frequencyList))) * getPositionScore(i, sentences.length)
	}
	
	return scores;
}	

var stopWords = ["i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", "yourself", "yourselves", "he", "him", "his", "himself", "she", "her", "hers", "herself", "it", "its", "itself", "they", "them", "their", "theirs", "themselves", "what", "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because", "as", "until", "while", "of", "at", "by", "for", "with", "about", "against", "between", "into", "through", "during", "before", "after", "above", "below", "to", "from", "up", "down", "in", "out", "on", "off", "over", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now"]

function getSummaryData(msg) {
	// Get the sentences. First we remove (), {}, [] and "". Then we use the library to extract the sentences.
	var sentences = [];
	// msg = msg.replace(/[\(()\)]/g, ' ').replace(/[{()}]/g, ' ').replace(/[\[\]']+/g, ' ').replace(/\"/g, "");
	msg = msg.replace(/[\(()\)]/g, ' ').replace(/[{()}]/g, ' ').replace(/[\[\]]+/g, ' ');

	// The library takes care of cases such as "Mr. Levy is awesome". The sentence is regarded as 1 sentence and not 2.
	var nlpObject = nlp(msg.toLowerCase());
	nlpObject.sentences().toStatement().forEach(s => sentences.push(s.normalize().out('text').slice(0, -1)));
	
	// Remove the stopwords of each sentence and stem each word using a Porter Stemmer
	sentences = sentences.map(s => s.split(" ").filter(w => !stopWords.includes(w)).map(w => stemmer(w)).join(" "));
	var frequencyList = getFrequencyList(sentences);
	
	var scores = getScores(sentences, frequencyList);
	var sentencesWithScores = [];
	nlpObject = nlp(msg);
	
	for (var i = 0; i < scores.length; i++) {
		sentencesWithScores[i] = [i, scores[i]];
	}
	
	// Sort by score
	sentencesWithScores.sort((first, second) => second[1] - first[1]);
	
	return [nlpObject, sentencesWithScores];
}

function summarize(nlpObject, sentencesWithScores, k) {
	// Take top k sentences
	sentencesWithScores = sentencesWithScores.slice(0, k);
	
	// Sort by index in order to print in order
	sentencesWithScores.sort((first, second) => first[0] - second[0]);

	// Generate the new text
	resultText = "";

	for (var i = 0; i < k; i++) {
		resultText += nlpObject.sentences(sentencesWithScores[i][0]).toStatement().out('text') + "<br>";
	}

	return resultText;
}

function updateSummary(resultDiv, additionalInformationDiv, summaryData, numberOfLines, originalText) {
	resultDiv.html(summarize(summaryData[0], summaryData[1], numberOfLines));
	additionalInformationDiv.html("Text shortned by " +
									parseInt(100 * (1 - (resultText.length - 4 * numberOfLines) / originalText.length)) +
									"%. Number of characters: " + (resultText.length - 4 * numberOfLines))
}

$(document).ready(function() {
	var numberOfLinesInput = $("#number_of_lines");
	var numberOfLinesForm = $("#number_of_lines_form");
	var resultDiv = $("#result_div");
	var additionalInformationDiv = $("#additional_information_div");
	var noTextDiv = $("#no_text_div");
	
	// Get the text to summarize from the background page
	textToSummarize = browser.extension.getBackgroundPage().textToSummarize;
	
	// Check if any text was selected
	if (textToSummarize.length <= 0) {
		noTextDiv.show();
		numberOfLinesForm.hide();
		resultDiv.hide();
		additionalInformationDiv.hide();
	}
	else {
		noTextDiv.hide();
		numberOfLinesForm.show();
		resultDiv.show();
		additionalInformationDiv.show();
	}
	
	// Get the summary data
	var summaryData = getSummaryData(textToSummarize);
	
	// Set the number of lines input
	var numberOfLinesHtml = "";
	for (var i = 1; i <= summaryData[1].length; i++) {
		numberOfLinesHtml += "<option>" + i + "</option>";
	}
	
	numberOfLinesInput.html(numberOfLinesHtml);
	
	// Update the summary when the number of lines changes
	numberOfLinesInput.change(() => updateSummary(resultDiv, additionalInformationDiv, summaryData, numberOfLinesInput[0].value, textToSummarize))
	
	// Update the summary when we open the popup
	numberOfLinesInput[0].value = Math.max(1, parseInt(summaryData[1].length / 3));
	updateSummary(resultDiv, additionalInformationDiv, summaryData, numberOfLinesInput[0].value, textToSummarize);
});