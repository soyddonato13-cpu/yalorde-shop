
(function () {
    const logBox = document.createElement('div');
    logBox.style.cssText = "position:fixed; bottom:0; padding: 10px; width:100%; max-height: 50vh; overflow-y:auto; background:rgba(0,0,0,0.9); color:#ff4444; font-family:monospace; z-index:99999; pointer-events:none; font-size:12px;";
    document.body.appendChild(logBox);

    function logError(msg) {
        const line = document.createElement('div');
        line.style.borderBottom = "1px solid #333";
        line.innerText = `[ERROR] ${msg}`;
        logBox.appendChild(line);
        // Force show if hidden
        logBox.style.display = 'block';
    }

    // Capture Global Errors
    window.onerror = function (message, source, lineno, colno, error) {
        logError(`${message} at ${source}:${lineno}`);
        return false;
    };

    // Capture Unhandled Rejections (Promises)
    window.addEventListener('unhandledrejection', function (event) {
        logError(`UNHANDLED PROMISE: ${event.reason}`);
    });

    // Capture Console Error
    const originalConsoleError = console.error;
    console.error = function (...args) {
        logError(args.map(a => (a && a.toString) ? a.toString() : a).join(' '));
        originalConsoleError.apply(console, args);
    };

    console.log("Logger Active");
})();
