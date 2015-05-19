var Q = require('q');
var R = require('ramda');

module.exports = function(DB) {
  var currentQuestion;

  return {
    start: start
  };

  function start() {
    return nextQuestion()
      .then(function() {
        setInterval(gameLoop, 10000)
      });
  }

  function gameLoop() {
    return answersForQuestion(currentQuestion)
      .then(R.filter(R.eqProps('answerId', currentQuestion)))
      .then(R.map(R.path(['userId'])))
      .tap(R.map(DB.Users.incScore))
      .then(R.curry(broadcastWinners)(currentQuestion))
      .then(nextQuestion);
  }

  function nextQuestion() {
    return retrieveQuestion()
      .then(setQuestion)
      .then(DB.Answers.deleteAll);
  }

  function setQuestion(question) {
    currentQuestion = question;
    DB.Broadcast.publish('game:question', R.omit(['answerId'], question));
  }

  function answersForQuestion(question) {
    return DB.Answers.findByParams({
      questionId: question.id
    });
  }

  function broadcastWinners(question, winners) {
    return DB.Broadcast.publish('game:result', {
      question: question,
      winners: winners
    });
  }

  function retrieveQuestion() {
    return Q.Promise(function(resolve) {
      DB.Questions.sample()
        .then(function(cursor) {
          cursor.next().then(resolve);
        });
    });
  }
};
