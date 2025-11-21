/**
 * Flavor Sliders UI Controller
 * Handles all interactive slider functionality for flavor preferences
 */

// Initialize all flavor sliders
function initFlavorSliders() {
    const flavors = ['umami', 'sweet', 'spice', 'sour', 'salty'];
    
    flavors.forEach(flavor => {
        const container = document.getElementById(flavor + 'Slider');
        const track = document.getElementById(flavor + 'Track');
        const handle = document.getElementById(flavor + 'Handle');
        const labels = document.getElementById(flavor + 'Labels');
        const icons = labels.querySelectorAll('.icon-item');
        
        let isDragging = false;
        const maxValue = 5;
        const defaultValue = 3;
        
        // Set initial value
        updateSlider(flavor, defaultValue);
        
        // Update slider visual state
        function updateSlider(flavorName, value) {
            const percent = ((value - 1) / (maxValue - 1)) * 100;
            track.style.width = percent + '%';
            handle.style.left = percent + '%';
            container.setAttribute('data-value', value);
            labels.setAttribute('data-value', value);
        }
        
        // Handle icon clicks
        icons.forEach((icon, index) => {
            icon.addEventListener('click', () => {
                const newValue = index + 1;
                updateSlider(flavor, newValue);
            });
        });
        
        // Handle slider drag
        function handleMouseMove(e) {
            if (!isDragging) return;
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
            const value = Math.round((percent / 100) * (maxValue - 1)) + 1;
            updateSlider(flavor, value);
        }
        
        function handleMouseUp() {
            isDragging = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
        
        container.addEventListener('mousedown', (e) => {
            isDragging = true;
            handleMouseMove(e);
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
        
        // Touch support for mobile
        container.addEventListener('touchstart', (e) => {
            isDragging = true;
            const touch = e.touches[0];
            const rect = container.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
            const value = Math.round((percent / 100) * (maxValue - 1)) + 1;
            updateSlider(flavor, value);
        });
        
        container.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const touch = e.touches[0];
            const rect = container.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
            const value = Math.round((percent / 100) * (maxValue - 1)) + 1;
            updateSlider(flavor, value);
        });
        
        container.addEventListener('touchend', () => {
            isDragging = false;
        });
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFlavorSliders);
} else {
    initFlavorSliders();
}

