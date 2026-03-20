// confidentiality.js — Basic deterrents (not security, just friction)

(function() {
    // Disable right-click context menu
    document.addEventListener('contextmenu', function(e) {
        if (!e.target.closest('textarea, input')) {
            e.preventDefault();
        }
    });

    // Disable Ctrl+A select-all on non-input elements
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'a' && !['TEXTAREA', 'INPUT'].includes(e.target.tagName)) {
            e.preventDefault();
        }
        // Disable Ctrl+S (no need to save HTML)
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
        }
    });

    // Disable drag on non-input elements
    document.addEventListener('dragstart', function(e) {
        if (!['TEXTAREA', 'INPUT'].includes(e.target.tagName)) {
            e.preventDefault();
        }
    });
})();
