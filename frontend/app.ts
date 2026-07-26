// API Configuration
const API_BASE_URL = "http://localhost:8000";

// DOM Elements
const shortenForm = document.getElementById("shorten-form");
const longUrlInput = document.getElementById("long-url-input");
const errorMessage = document.getElementById("error-message");
const errorText = document.getElementById("error-text");
const urlContainer = document.getElementById("url-container");
const loader = document.getElementById("loader");
const emptyState = document.getElementById("empty-state");
const linkCount = document.getElementById("link-count");

// Initial Load
document.addEventListener("DOMContentLoaded", fetchAndRenderUrls);

// Event Listener: Form Submission to create a shortened URL
shortenForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const longUrl = longUrlInput.value.trim();
    if (!longUrl) return;

    try {
        const response = await fetch(`${API_BASE_URL}/urls`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ url: longUrl })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to shorten URL. Make sure it is a valid format (e.g., https://example.com).");
        }

        // Reset input form
        longUrlInput.value = "";
        
        // Refresh the list with the newly created URL
        await fetchAndRenderUrls();
    } catch (err: any) {
        showError(err.message);
    }
});

// Function: Fetch list of URLs and update the DOM
async function fetchAndRenderUrls() {
    showLoader();
    try {
        const response = await fetch(`${API_BASE_URL}/urls`);
        if (!response.ok) throw new Error("Could not retrieve URLs.");
        
        const urls = await response.json();
        renderUrlsList(urls);
    } catch (err: any) {
        showError("Unable to connect to the backend. Is your FastAPI server running?");
        renderUrlsList([]); // fallbacks to showing empty state
    } finally {
        hideLoader();
    }
}

// Function: Render the list of URL cards in the UI
function renderUrlsList(urls) {
    // Update link count bubble
    linkCount.innerText = `${urls.length} link${urls.length === 1 ? "" : "s"}`;

    if (urls.length === 0) {
        emptyState.classList.remove("hidden");
        urlContainer.classList.add("hidden");
        return;
    }

    emptyState.classList.add("hidden");
    urlContainer.classList.remove("hidden");

    // Clear previous cards
    urlContainer.innerHTML = "";

    // Generate HTML string for each card
    urls.forEach(url => {
        const shortLink = `${API_BASE_URL}/${url.short_code}`;
        const cardHtml = `
            <div class="bg-slate-800/40 border border-slate-800/80 hover:border-slate-700/80 p-5 rounded-2xl flex flex-col justify-between gap-4 hover:shadow-xl transition-all relative overflow-hidden group">
                <!-- Highlight accent on hover -->
                <div class="absolute top-0 left-0 w-1.5 h-full bg-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div class="space-y-2">
                    <!-- Long original URL -->
                    <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Original Link</div>
                    <div class="text-slate-300 font-medium truncate pr-4 text-sm" title="${url.long_url}">
                        ${url.long_url}
                    </div>
                </div>

                <div class="bg-slate-950/50 p-3 rounded-xl border border-slate-800/30 flex justify-between items-center gap-2">
                    <!-- Short Link -->
                    <a href="${shortLink}" target="_blank" class="text-cyan-400 hover:text-cyan-300 font-bold font-mono text-base truncate hover:underline flex items-center gap-1.5">
                        ${url.short_code} <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                    </a>
                    
                    <!-- Copy Button -->
                    <button onclick="copyToClipboard('${shortLink}', this)" class="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-lg transition-all text-xs flex items-center gap-1">
                        <i class="fa-regular fa-copy"></i> Copy
                    </button>
                </div>

                <!-- Footer Card Meta Info -->
                <div class="flex justify-between items-center border-t border-slate-800/50 pt-3 text-xs text-slate-500">
                    <span class="flex items-center gap-1">
                        <i class="fa-solid fa-chart-simple text-cyan-500/80"></i>
                        <strong class="text-slate-300">${url.visits}</strong> visit${url.visits === 1 ? "" : "s"}
                    </span>
                    
                    <button onclick="deleteUrl('${url.short_code}')" class="text-rose-500 hover:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 font-semibold">
                        <i class="fa-regular fa-trash-can"></i> Delete
                    </button>
                </div>
            </div>
        `;
        urlContainer.insertAdjacentHTML("beforeend", cardHtml);
    });
}

// Function: Copy short link helper
window.copyToClipboard = async function(text, buttonEl) {
    try {
        await navigator.clipboard.writeText(text);
        const originalContent = buttonEl.innerHTML;
        buttonEl.innerHTML = `<i class="fa-solid fa-check text-green-400"></i> Copied!`;
        buttonEl.classList.add("bg-green-500/10", "text-green-400");
        setTimeout(() => {
            buttonEl.innerHTML = originalContent;
            buttonEl.classList.remove("bg-green-500/10", "text-green-400");
        }, 1500);
    } catch (err) {
        console.error("Failed to copy!", err);
    }
};

// Function: Delete short code and reload
window.deleteUrl = async function(code) {
    if (!confirm("Are you sure you want to delete this short link?")) return;

    try {
        const response = await fetch(`${API_BASE_URL}/urls/${code}`, {
            method: "DELETE"
        });

        if (!response.ok) throw new Error("Could not delete short code.");
        await fetchAndRenderUrls();
    } catch (err) {
        showError(err.message);
    }
};

// Loader and Error Helper functions
function showLoader() {
    loader.classList.remove("hidden");
    emptyState.classList.add("hidden");
}

function hideLoader() {
    loader.classList.add("hidden");
}

function showError(msg) {
    errorText.innerText = msg;
    errorMessage.classList.remove("hidden");
}

function hideError() {
    errorMessage.classList.add("hidden");
}

print("Frontend app.ts loaded successfully.");