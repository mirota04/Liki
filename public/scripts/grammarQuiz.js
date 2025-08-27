// Minimal front-end logic for Grammar Quiz
(function(){
	document.addEventListener('DOMContentLoaded', function(){
		const form = document.getElementById('grammarQuizForm');
		const btnSubmitCheck = document.getElementById('btnSubmitCheck');
		if (!form || !btnSubmitCheck) return;

		function getAnswers(){
			const data = new FormData(form);
			const obj = {};
			for (const [k,v] of data.entries()) obj[k] = v.toString().trim();
			return obj;
		}

		btnSubmitCheck.addEventListener('click', async function(){
			const answers = getAnswers();
			try {
				const res = await fetch('/quiz/grammar/submit', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ answers }) });
				if (res.ok) {
					alert('Submitted! Scoring will be added next.');
				} else {
					alert('Submission failed.');
				}
			} catch (err) {
				console.error(err);
				alert('Network error.');
			}
		});
	});
})();
