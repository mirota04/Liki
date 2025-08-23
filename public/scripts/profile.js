document.addEventListener('DOMContentLoaded', function() {
	// Profile dropdown functionality
	const profileDropdownBtn = document.getElementById('profileDropdownBtn');
	const profileDropdown = document.getElementById('profileDropdown');

	if (profileDropdownBtn && profileDropdown) {
		// Toggle dropdown on button click
		profileDropdownBtn.addEventListener('click', function(e) {
			e.stopPropagation();
			profileDropdown.classList.toggle('hidden');
		});

		// Close dropdown when clicking outside
		document.addEventListener('click', function(e) {
			if (!profileDropdown.contains(e.target) && !profileDropdownBtn.contains(e.target)) {
				profileDropdown.classList.add('hidden');
			}
		});

		// Close dropdown on escape key
		document.addEventListener('keydown', function(e) {
			if (e.key === 'Escape') {
				profileDropdown.classList.add('hidden');
			}
		});
	}

	// Future: fetch dynamic achievements/stats if needed.
	// Placeholder for any interactive behaviors unique to profile.

	// Smooth scroll to sections (if anchors are added later)
	document.querySelectorAll('a[href^="#"]').forEach(anchor => {
		anchor.addEventListener('click', function (e) {
			e.preventDefault();
			document.querySelector(this.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' });
		});
	});
});

// Logout function
function logout() {
	if (confirm('Are you sure you want to logout?')) {
		fetch('/logout', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			}
		})
		.then(() => {
			window.location.href = '/login';
		})
		.catch(error => {
			console.error('Logout error:', error);
			// Fallback: redirect to login anyway
			window.location.href = '/login';
		});
	}
}


