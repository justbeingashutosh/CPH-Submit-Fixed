chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'cph-submit') {
    console.log("Received submission data:", message.payload);
    const data = message.payload;

    // Fill in the form fields after the page is loaded.
    function fillForm() {
      console.log("Filling in the submission form.");

      const problemEl = document.getElementsByName('submittedProblemCode')[0];
      if (!problemEl) {
        console.log("No problem Id input present. It may already be filled.");
      } else {
        problemEl.value = data.problemName;
        console.log("Filled problem name.");
      }

      // Handle the contestId field if present (for contest submissions)
      const contestIdEl = document.getElementsByName('contestId')[0];
      if (contestIdEl) {
        const contestIdFromUrl = window.location.pathname.split('/')[2];
        contestIdEl.value = contestIdFromUrl;
        console.log("Filled contest ID:", contestIdFromUrl);
      } else {
        console.log("No contestId field present. Skipping.");
      }

      const languageEl = document.getElementsByName('programTypeId')[0];
      if (languageEl) {
        languageEl.value = data.languageId;
        console.log("Filled language ID.");
      } else {
        console.log("Language element not found.");
      }

      const codeEl = document.getElementsByName('source')[0];
      if (codeEl) {
        codeEl.value = data.sourceCode;
        console.log("Filled source code.");
      } else {
        console.log("Source code element not found.");
      }

      const submitBtn = document.getElementsByClassName('submit')[0];
      if (submitBtn) {
        console.log("Clicking submit button.");
        submitBtn.click();
      } else {
        console.log("Submit button not found.");
      }
    }

    // If the document is already loaded, fill the form; otherwise, wait for it.
    if (document.readyState === "complete") {
      fillForm();
    } else {
      window.addEventListener('load', fillForm);
    }
  }
});