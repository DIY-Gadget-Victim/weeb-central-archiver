document
  .getElementById("downloadForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const seriesId = document.getElementById("seriesId").value;
    const mangaTitle = document.getElementById("mangaTitle").value;

    alert("Download Started!");

    try {
      const response = await fetch("/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ seriesId, mangaTitle }),
      });

      const result = await response.json();

      if (result.success) {
        alert("Download completed successfully!");
      } else {
        alert("Failed to complete download.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred.");
    }
  });
