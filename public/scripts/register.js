// Registration Form Validation and Handling
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registerForm');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const repeatPasswordInput = document.getElementById('repeatPassword');
    const termsCheckbox = document.getElementById('terms');
    const registerBtn = document.getElementById('registerBtn');

    // Real-time validation
    usernameInput.addEventListener('input', () => {
        validateUsername();
        validateForm();
    });
    emailInput.addEventListener('input', () => {
        validateEmail();
        validateForm();
    });
    passwordInput.addEventListener('input', () => {
        validatePassword();
        validateForm();
    });
    repeatPasswordInput.addEventListener('input', () => {
        validateRepeatPassword();
        validateForm();
    });
    termsCheckbox.addEventListener('change', validateForm);

    // Form submission - let the form submit normally to the server
    // form.addEventListener('submit', handleFormSubmission);

    // Password toggle function
    window.togglePassword = function(fieldId) {
        const input = document.getElementById(fieldId);
        const icon = document.getElementById(fieldId + '-eye-icon');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'ri-eye-off-line';
        } else {
            input.type = 'password';
            icon.className = 'ri-eye-line';
        }
    };

    // Validation functions
    function validateUsername() {
        const username = usernameInput.value.trim();
        const errorElement = document.getElementById('username-error');
        
        if (username.length === 0) {
            showError(usernameInput, errorElement, 'Username is required');
            return false;
        } else if (username.length < 3) {
            showError(usernameInput, errorElement, 'Username must be at least 3 characters');
            return false;
        } else if (username.length > 20) {
            showError(usernameInput, errorElement, 'Username must be less than 20 characters');
            return false;
        } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            showError(usernameInput, errorElement, 'Username can only contain letters, numbers, and underscores');
            return false;
        } else {
            showSuccess(usernameInput, errorElement);
            return true;
        }
    }

    function validateEmail() {
        const email = emailInput.value.trim();
        const errorElement = document.getElementById('email-error');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (email.length === 0) {
            showError(emailInput, errorElement, 'Email is required');
            return false;
        } else if (!emailRegex.test(email)) {
            showError(emailInput, errorElement, 'Please enter a valid email address');
            return false;
        } else {
            showSuccess(emailInput, errorElement);
            return true;
        }
    }

    function validatePassword() {
        const password = passwordInput.value;
        const errorElement = document.getElementById('password-error');
        const successElement = document.getElementById('password-success');
        
        // Check minimum length
        if (password.length < 8) {
            showError(passwordInput, errorElement, 'Password must be at least 8 characters long');
            hideSuccess(successElement);
            updatePasswordStrength(0);
            return false;
        }
        
        // Calculate password strength
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        updatePasswordStrength(strength);
        
        if (strength >= 3) {
            showSuccess(passwordInput, errorElement);
            showSuccessMessage(successElement);
            return true;
        } else {
            showError(passwordInput, errorElement, 'Password is too weak. Include uppercase, lowercase, numbers, and symbols');
            hideSuccess(successElement);
            return false;
        }
    }

    function validateRepeatPassword() {
        const password = passwordInput.value;
        const repeatPassword = repeatPasswordInput.value;
        const errorElement = document.getElementById('repeatPassword-error');
        
        if (repeatPassword.length === 0) {
            showError(repeatPasswordInput, errorElement, 'Please confirm your password');
            return false;
        } else if (password !== repeatPassword) {
            showError(repeatPasswordInput, errorElement, 'Passwords do not match');
            return false;
        } else {
            showSuccess(repeatPasswordInput, errorElement);
            return true;
        }
    }

    function validateForm() {
        const isUsernameValid = validateUsername();
        const isEmailValid = validateEmail();
        const isPasswordValid = validatePassword();
        const isRepeatPasswordValid = validateRepeatPassword();
        const isTermsAccepted = termsCheckbox.checked;
        
        const isFormValid = isUsernameValid && isEmailValid && isPasswordValid && isRepeatPasswordValid && isTermsAccepted;
        
        // Debug logging
        console.log('Form validation:', {
            username: isUsernameValid,
            email: isEmailValid,
            password: isPasswordValid,
            repeatPassword: isRepeatPasswordValid,
            terms: isTermsAccepted,
            overall: isFormValid
        });
        
        // Don't disable the button - let the form submit normally
        // registerBtn.disabled = !isFormValid;
        return isFormValid;
    }

    // Helper functions
    function showError(input, errorElement, message) {
        input.classList.remove('input-focus', 'input-success');
        input.classList.add('input-error');
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }

    function showSuccess(input, errorElement) {
        input.classList.remove('input-focus', 'input-error');
        input.classList.add('input-success');
        errorElement.classList.add('hidden');
    }

    function showSuccessMessage(successElement) {
        successElement.classList.remove('hidden');
    }

    function hideSuccess(successElement) {
        successElement.classList.add('hidden');
    }

    function updatePasswordStrength(strength) {
        const strengthBars = [
            document.getElementById('strength-1'),
            document.getElementById('strength-2'),
            document.getElementById('strength-3'),
            document.getElementById('strength-4')
        ];
        
        strengthBars.forEach((bar, index) => {
            bar.className = 'password-strength flex-1';
            if (index < strength) {
                if (strength <= 2) {
                    bar.classList.add('strength-weak');
                } else if (strength <= 3) {
                    bar.classList.add('strength-medium');
                } else {
                    bar.classList.add('strength-strong');
                }
            }
        });
    }

    // Error handling functions
    function showRegisterError(message) {
        const errorDiv = document.getElementById('registerError');
        const errorMessage = document.getElementById('registerErrorMessage');
        errorMessage.textContent = message;
        errorDiv.classList.remove('hidden');
        errorDiv.classList.add('error-slide-in', 'error-bounce');
        
        // Auto-hide after 8 seconds
        setTimeout(() => {
            hideRegisterError();
        }, 8000);
    }
    
    function hideRegisterError() {
        const errorDiv = document.getElementById('registerError');
        errorDiv.classList.add('hidden');
    }
    
    // Check for error parameters in URL and display error messages
    function checkForErrors() {
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        
        if (error) {
            let message = 'An error occurred during registration. Please try again.';
            
            switch(error) {
                case 'user_exists':
                    message = 'A user with this email or username already exists. Please try a different one or log in instead.';
                    break;
                case 'server_error':
                    message = 'A server error occurred. Please try again later.';
                    break;
                case 'validation_error':
                    message = 'Please check your input and try again.';
                    break;
                default:
                    message = 'Registration failed. Please try again.';
            }
            
            showRegisterError(message);
            
            // Clean up the URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    }
    
    // Check for errors when page loads
    checkForErrors();

    // Initial form validation
    validateForm();
});

// Success message function
function showSuccessMessage(message) {
    // Create success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full';
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="ri-check-line mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}
