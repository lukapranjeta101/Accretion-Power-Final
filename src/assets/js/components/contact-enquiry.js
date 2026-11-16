const form = document.getElementById('contact-enquiry');

if (form) {
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const value = (name) => String(data.get(name) || '').trim();
        const subject = value('subject') || 'Project enquiry';
        const body = [
            `Name: ${value('First-Name')} ${value('Last-Name')}`,
            `Email: ${value('email-address')}`,
            `Phone: ${value('phone-number') || 'Not provided'}`,
            '',
            value('message'),
        ].join('\r\n');

        window.location.href = `mailto:benjamin.vietmeier@accretionpower.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        document.getElementById('contact-form-status').textContent =
            'Continue in your email app to review and send. If it did not open, email benjamin.vietmeier@accretionpower.com directly. Your details remain here.';
    });
}
