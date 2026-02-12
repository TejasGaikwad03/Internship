document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('authForm');
    const toggleMode = document.getElementById('toggleMode');
    const formTitle = document.getElementById('formTitle');
    const submitBtn = authForm.querySelector('button[type="submit"]');

    let isRegister = false;

    toggleMode.addEventListener('click', (e) => {
        e.preventDefault();
        isRegister = !isRegister;
        if (isRegister) {
            formTitle.textContent = 'Register';
            submitBtn.textContent = 'Create Account';
            toggleMode.textContent = 'Already have an account? Login';
        } else {
            formTitle.textContent = 'Login';
            submitBtn.textContent = 'Login';
            toggleMode.textContent = 'Need an account? Register';
        }
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const role = 'student'; // Default registration role

        const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, role })
            });

            const data = await response.json();

            if (response.ok) {
                // If register successful, auto login or just alert
                if (isRegister) {
                    alert('Registration successful! Please login.');
                    // Switch back to login mode
                    isRegister = false;
                    toggleMode.click(); // Trigger click to switch UI back
                } else {
                    // Login successful
                    localStorage.setItem('user', JSON.stringify(data.user));
                    if (data.user.role === 'admin') {
                        window.location.href = 'admin_dashboard.html';
                    } else {
                        window.location.href = 'student_dashboard.html';
                    }
                }
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error(error);
            alert('Authentication failed');
        }
    });
});
