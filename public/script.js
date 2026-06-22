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

    // SVG Network elements
    const svgConnections = document.getElementById("svg-connections");
    const svgNodes = document.getElementById("svg-nodes");

    // Circular Progress Settings
    const circleRadius = 50;
    const circumference = 2 * Math.PI * circleRadius; // ~314.159

    // Default mock data for initial load
    const defaultOverlap = [
        { product_name: "Apple Watch Series 9", similarity: 0.3462, threat_level: "CRITICAL" },
        { product_name: "Masimo W1 Medical Watch", similarity: 0.1812, threat_level: "LOW" },
        { product_name: "Samsung Galaxy Watch", similarity: 0.0182, threat_level: "LOW" },
        { product_name: "Tesla Model Y Vehicle", similarity: 0.0, threat_level: "LOW" }
    ];

    function updateGauge(probability) {
        // Update circular svg stroke offset if present
        if (verdictGauge) {
            const offset = circumference - (probability * circumference);
            verdictGauge.style.strokeDashoffset = offset;
            
            // Color updates
            if (probability >= 0.70) {
                verdictGauge.style.stroke = "#10b981"; // Emerald
            } else {
                verdictGauge.style.stroke = "#ff5e84"; // Rose
            }
        }
        
        // Update text
        if (resSuccessProb) {
            resSuccessProb.textContent = `${(probability * 100).toFixed(1)}%`;
        }

        // Update horizontal pointer if present
        const pointer = document.getElementById("merits-pointer");
        if (pointer) {
            pointer.style.left = `${probability * 100}%`;
            if (probability >= 0.70) {
                pointer.style.color = "#10b981"; // Emerald
            } else {
                pointer.style.color = "#ff5e84"; // Rose
            }
        }
    }

    // Dynamic SVG Network Map Renderer
    function renderNodeMap(patentId, overlapResults) {
        // Clear SVG layers
        svgConnections.innerHTML = "";
        svgNodes.innerHTML = "";

        const cx = 500;
        const cy = 300;

        // Render Central Node (Target Patent)
        const centralGlow = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        centralGlow.setAttribute("cx", cx);
        centralGlow.setAttribute("cy", cy);
        centralGlow.setAttribute("r", 50);
        centralGlow.setAttribute("fill", "url(#patent-glow-grad)");
        centralGlow.setAttribute("class", "pulse-circle");
        svgNodes.appendChild(centralGlow);

        const centralDashedRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        centralDashedRing.setAttribute("cx", cx);
        centralDashedRing.setAttribute("cy", cy);
        centralDashedRing.setAttribute("r", 35);
        centralDashedRing.setAttribute("stroke", "rgba(245, 208, 108, 0.4)");
        centralDashedRing.setAttribute("stroke-width", "1.5");
        centralDashedRing.setAttribute("stroke-dasharray", "4 3");
        centralDashedRing.setAttribute("fill", "none");
        centralDashedRing.setAttribute("class", "central-glow-ring");
        svgNodes.appendChild(centralDashedRing);

        const centralCore = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        centralCore.setAttribute("cx", cx);
        centralCore.setAttribute("cy", cy);
        centralCore.setAttribute("r", 15);
        centralCore.setAttribute("fill", "#f5d06c");
        svgNodes.appendChild(centralCore);

        // Format central label (add US- prefix if numeric only)
        let displayPatentId = patentId;
        if (/^\d+$/.test(displayPatentId)) {
            displayPatentId = "US-" + displayPatentId;
        } else if (/^[A-Za-z]{2}\d+/.test(displayPatentId)) {
            const country = displayPatentId.slice(0, 2);
            const rest = displayPatentId.slice(2);
            if (!rest.startsWith("-")) {
                displayPatentId = country.toUpperCase() + "-" + rest;
            }
        }

        const centralText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        centralText.setAttribute("x", cx);
        centralText.setAttribute("y", cy + 42);
        centralText.setAttribute("text-anchor", "middle");
        centralText.setAttribute("fill", "#f5d06c");
        centralText.setAttribute("font-size", "14");
        centralText.setAttribute("font-weight", "700");
        centralText.setAttribute("font-family", "Outfit, sans-serif");
        centralText.textContent = displayPatentId;
        svgNodes.appendChild(centralText);

        // Render Satellite Nodes (Competitor Products)
        const numNodes = overlapResults.length;
        overlapResults.forEach((item, index) => {
            // Distribute angles evenly (tilt by -45deg so it lays out in a clean cross)
            const angle = (index * 2 * Math.PI) / numNodes - Math.PI / 4;
            
            // Radius distance is inversely proportional to similarity (closer = higher threat)
            const r = 240 - (item.similarity * 140);
            
            const sx = cx + r * Math.cos(angle);
            const sy = cy + r * Math.sin(angle);

            // Determine color and glow gradients based on threat level
            let color = "#10b981"; // Emerald (Low)
            let glowGrad = "url(#green-glow-grad)";
            if (item.threat_level === "CRITICAL" || item.similarity > 0.45) {
                color = "#ff5e84"; // Rose (Critical)
                glowGrad = "url(#rose-glow-grad)";
            } else if (item.threat_level === "HIGH" || item.similarity > 0.25) {
                color = "#a388ff"; // Purple (High)
                glowGrad = "url(#purple-glow-grad)";
            }

            // 1. Render Connection Path (Line)
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", cx);
            line.setAttribute("y1", cy);
            line.setAttribute("x2", sx);
            line.setAttribute("y2", sy);
            line.setAttribute("stroke", color);
            line.setAttribute("stroke-width", (1.5 + item.similarity * 3).toFixed(2));
            line.setAttribute("stroke-opacity", (0.15 + item.similarity * 0.65).toFixed(2));
            line.setAttribute("class", "link-line");
            // Reverse animation direction for high threat values
            if (item.similarity > 0.25) {
                line.style.animationDirection = "reverse";
            }
            svgConnections.appendChild(line);

            // 2. Render Satellite Node Wrapper (G Group for hover scaling)
            const nodeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            nodeGroup.setAttribute("class", "satellite-node");
            
            // Glow Circle
            const glowCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            glowCircle.setAttribute("cx", sx);
            glowCircle.setAttribute("cy", sy);
            glowCircle.setAttribute("r", 28);
            glowCircle.setAttribute("fill", glowGrad);
            glowCircle.setAttribute("opacity", "0.4");
            nodeGroup.appendChild(glowCircle);

            // Solid Core
            const coreCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            coreCircle.setAttribute("cx", sx);
            coreCircle.setAttribute("cy", sy);
            coreCircle.setAttribute("r", 9);
            coreCircle.setAttribute("fill", color);
            coreCircle.setAttribute("stroke", "rgba(255,255,255,0.2)");
            coreCircle.setAttribute("stroke-width", "2");
            nodeGroup.appendChild(coreCircle);

            // Product Name Label
            const textName = document.createElementNS("http://www.w3.org/2000/svg", "text");
            textName.setAttribute("x", sx);
            textName.setAttribute("y", sy - 18);
            textName.setAttribute("text-anchor", "middle");
            textName.setAttribute("fill", "#f1f5f9");
            textName.setAttribute("font-size", "12");
            textName.setAttribute("font-weight", "500");
            textName.setAttribute("font-family", "Outfit, sans-serif");
            textName.textContent = item.product_name;
            nodeGroup.appendChild(textName);

            // Similarity Score Label
            const textScore = document.createElementNS("http://www.w3.org/2000/svg", "text");
            textScore.setAttribute("x", sx);
            textScore.setAttribute("y", sy + 22);
            textScore.setAttribute("text-anchor", "middle");
            textScore.setAttribute("fill", color);
            textScore.setAttribute("font-size", "11");
            textScore.setAttribute("font-weight", "700");
            textScore.setAttribute("font-family", "JetBrains Mono, monospace");
            textScore.textContent = `${(item.similarity * 100).toFixed(1)}%`;
            nodeGroup.appendChild(textScore);

            svgNodes.appendChild(nodeGroup);
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

    // Dynamic Island elements
    const dynamicIsland = document.getElementById("dynamic-island");
    const islandStatusText = document.getElementById("island-status-text");
    const islandBadge = document.getElementById("island-badge");

    // Trigger initial visual load with mock oximeter values
    updateGauge(0.607);
    renderNodeMap("10912502", defaultOverlap);

    // Form Submission
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const patentNumber = input.value.trim();
        if (!patentNumber) return;

        // Set Loading States
        submitBtn.disabled = true;
        spinner.style.display = "inline-block";
        resultsContainer.classList.add("loading");
        
        // Morph Dynamic Island to loading state
        dynamicIsland.className = "dynamic-island loading";
        islandStatusText.textContent = "Analyzing Patent...";

        try {
            const response = await fetch("/api/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ patent_number: patentNumber })
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
                resPatentSource.style.borderColor = "#06b6d4";
                resPatentSource.style.color = "#06b6d4";
            } else {
                resPatentSource.className = "meta-val badge-source";
                resPatentSource.style.borderColor = "";
                resPatentSource.style.color = "";
            }

            // 2. Render SVG Network Graph Node Map
            renderNodeMap(data.patent.number, data.overlap_results);

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

            // Morph Dynamic Island to success state and revert after 4 seconds
            dynamicIsland.className = "dynamic-island success";
            islandStatusText.textContent = `Consensus Score: ${(prob * 100).toFixed(0)}%`;
            islandBadge.textContent = displayName;
            
            setTimeout(() => {
                dynamicIsland.className = "dynamic-island";
                islandStatusText.textContent = "System Idle";
            }, 4000);

        } catch (error) {
            console.error(error);
            // Morph Dynamic Island to error state and revert after 4 seconds
            dynamicIsland.className = "dynamic-island error";
            islandStatusText.textContent = "Analysis Failed";
            
            setTimeout(() => {
                dynamicIsland.className = "dynamic-island";
                islandStatusText.textContent = "System Idle";
            }, 4000);
            
            alert("Error running patent analysis. Please check your connection or try again.");
        } finally {
            // Restore States
            submitBtn.disabled = false;
            spinner.style.display = "none";
            resultsContainer.classList.remove("loading");
        }
    });
});
