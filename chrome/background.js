chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('window.html', {
    id: 'main',
    bounds: {
      width: 500,
      height: 600
    }
  });
});