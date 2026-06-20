// script.js - LitiShield IP Frontend Logic

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("analysis-form");
    const input = document.getElementById("patent-number-input");
    const submitBtn = document.getElementById("submit-button");
    const spinner = document.getElementById("btn-spinner");
    const resultsContainer = document.getElementById("dashboard-results");

    // Results fields
    const resPatentNum = document.getElementById("res-patent-number");
    const resPatentDate = document.getElementById("res-patent-date");
    const resPatentSource = document.getElementById("res-patent-source");
    const resPatentTitle = document.getElementById("res-patent-title");
    const resPatentAbstract = document.getElementById("res-patent-abstract");
    const resProductsList = document.getElementById("res-products-list");
    
    const resSuccessProb = document.getElementById("res-success-prob");
    const verdictGauge = document.getElementById("verdict-gauge");
    const resRecommendation = document.getElementById("res-recommendation");
    const resVerdictVerbiage = document.getElementById("res-verdict-verbiage");
    const resAgentsList = document.getElementById("res-agents-list");

    // Circular Progress Settings
    const circleRadius = 50;
    const circumference = 2 * Math.PI * circleRadius; // ~314.159

    function updateGauge(probability) {
        // Update circular svg stroke offset
        const offset = circumference - (probability * circumference);
        verdictGauge.style.strokeDashoffset = offset;
        
        // Update text
        resSuccessProb.textContent = `${(probability * 100).toFixed(1)}%`;
        
        // Color updates
        if (probability >= 0.70) {
            verdictGauge.style.stroke = "#10b981"; // Emerald
        } else {
            verdictGauge.style.stroke = "#ef4444"; // Rose
        }
    }

    function renderProducts(overlapResults) {
        resProductsList.innerHTML = "";
        
        overlapResults.forEach(item => {
            const pct = (item.similarity * 100).toFixed(2);
            
            let threatClass = "threat-low";
            if (item.threat_level === "CRITICAL") threatClass = "threat-critical";
            if (item.threat_level === "HIGH") threatClass = "threat-high";

            const productHtml = `
                <div class="product-item">
                    <div class="product-info">
                        <span class="product-name">${item.product_name}</span>
                        <span class="threat-badge ${threatClass}">${item.threat_level}</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${pct}%;"></div>
                    </div>
                    <span class="score-pct">${pct}% Overlap</span>
                </div>
            `;
            resProductsList.insertAdjacentHTML("beforeend", productHtml);
        });
    }

    function renderAgents(reviews) {
        resAgentsList.innerHTML = "";
        
        reviews.forEach(item => {
            const scorePct = (item.score * 100).toFixed(0);
            const agentHtml = `
                <div class="agent-item">
                    <div class="agent-header">
                        <span class="agent-title">${item.name}</span>
                        <span class="agent-weight">Weight: ${(item.weight * 100).toFixed(0)}%</span>
                    </div>
                    <div class="agent-body">
                        <span class="agent-score">Score: ${scorePct}%</span>
                        <p class="agent-finding">${item.finding}</p>
                    </div>
                </div>
            `;
            resAgentsList.insertAdjacentHTML("beforeend", agentHtml);
        });
    }

    // Trigger gauge animation for default mock values on initial load
    updateGauge(0.607);

    // Form Submission
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const patentNumber = input.value.trim();
        if (!patentNumber) return;

        // Set Loading States
        submitBtn.disabled = true;
        spinner.style.display = "inline-block";
        resultsContainer.classList.add("loading");

        try {
            const response = await fetch("/api/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: json = JSON.stringify({ patent_number: patentNumber })
            });

            if (!response.ok) {
                throw new Error("Analysis request failed.");
            }

            const data = await response.json();

            // 1. Update Patent Info
            let displayName = data.patent.number;
            if (/^\d+$/.test(displayName)) {
                displayName = "US-" + displayName;
            } else if (/^[A-Za-z]{2}\d+/.test(displayName)) {
                const country = displayName.slice(0, 2);
                const rest = displayName.slice(2);
                if (!rest.startsWith("-")) {
                    displayName = country.toUpperCase() + "-" + rest;
                }
            }
            resPatentNum.textContent = displayName;
            resPatentDate.textContent = data.patent.date;
            resPatentSource.textContent = data.patent.source;
            resPatentTitle.textContent = data.patent.title;
            resPatentAbstract.textContent = data.patent.abstract;

            // Update source styling based on live vs cached
            if (data.patent.source.includes("Live")) {
                resPatentSource.className = "meta-val badge-source";
                resPatentSource.style.borderColor = "#10b981";
                resPatentSource.style.color = "#10b981";
            } else {
                resPatentSource.className = "meta-val badge-source";
                resPatentSource.style.borderColor = "";
                resPatentSource.style.color = "";
            }

            // 2. Update Product Overlap List
            renderProducts(data.overlap_results);

            // 3. Update Gauge and Committee Verdict
            const prob = data.committee_verdict.success_probability;
            updateGauge(prob);

            resRecommendation.textContent = data.committee_verdict.recommendation;
            if (prob >= 0.70) {
                resRecommendation.className = "verdict-badge verdict-approve";
                resVerdictVerbiage.textContent = "Diligence score meets requirements. Case approved for funding.";
            } else {
                resRecommendation.className = "verdict-badge verdict-reject";
                resVerdictVerbiage.textContent = "Case viability does not meet the minimum funding threshold (70.0%).";
            }

            // 4. Update Agents list
            renderAgents(data.committee_verdict.agent_reviews);

        } catch (error) {
            console.error(error);
            alert("Error running patent analysis. Please check your connection or try again.");
        } finally {
            // Restore States
            submitBtn.disabled = false;
            spinner.style.display = "none";
            resultsContainer.classList.remove("loading");
        }
    });
});
