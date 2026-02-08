
(async function () {
    console.log("DIAGNOSTIC START");
    const report = {
        jsRunning: true,
        apiStatus: 'pending',
        productCount: 0,
        domCheck: document.getElementById('product-grid') ? 'found' : 'missing',
        error: null
    };

    try {
        const res = await fetch('/api/products');
        report.apiStatus = res.status;
        if (res.ok) {
            const data = await res.json();
            report.productCount = data.length;

            // Force visible feedback for user
            const testDiv = document.createElement('div');
            testDiv.style.cssText = "position:fixed; top:0; left:0; width:100%; height:50px; background:green; color:white; z-index:9999; display:flex; justify-content:center; align-items:center; font-weight:bold;";
            testDiv.innerText = `DIAGNÓSTICO: JS OK | API ${res.status} | PROD ${data.length}`;
            document.body.appendChild(testDiv);
        } else {
            const errDiv = document.createElement('div');
            errDiv.style.cssText = "position:fixed; top:0; left:0; width:100%; height:50px; background:red; color:white; z-index:9999; display:flex; justify-content:center; align-items:center; font-weight:bold;";
            errDiv.innerText = `ERROR API: ${res.status}`;
            document.body.appendChild(errDiv);
        }
    } catch (e) {
        report.error = e.toString();
        const errDiv = document.createElement('div');
        errDiv.style.cssText = "position:fixed; top:0; left:0; width:100%; height:50px; background:red; color:white; z-index:9999; display:flex; justify-content:center; align-items:center; font-weight:bold;";
        errDiv.innerText = `ERROR FATAL JS: ${e.toString()}`;
        document.body.appendChild(errDiv);
    }
    console.log("DIAGNOSTIC REPORT:", JSON.stringify(report));
})();
