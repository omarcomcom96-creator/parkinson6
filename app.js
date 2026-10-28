(() => {
  "use strict";

  // تهيئة عناصر الصفحة العامة والترويسة
  const currentYear = document.getElementById("currentYear");
  if (currentYear) currentYear.textContent = String(new Date().getFullYear());

  const backToTop = document.getElementById("backToTop");
  if (backToTop) {
    const updateBackToTop = () => {
      const footer = document.querySelector(".site-footer");
      const footerRect = footer?.getBoundingClientRect();
      const footerIsVisible = Boolean(
        footerRect && footerRect.top < window.innerHeight && footerRect.bottom > 0,
      );
      backToTop.hidden = window.scrollY < 500 || footerIsVisible;
    };
    window.addEventListener("scroll", updateBackToTop, { passive: true });
    updateBackToTop();
    backToTop.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    });
  }

  const menuToggle = document.getElementById("menuToggle");
  const primaryNav = document.getElementById("primaryNav");
  const appSidebar = document.getElementById("appSidebar");
  if (menuToggle && primaryNav) {
    menuToggle.addEventListener("click", () => {
      if (document.body.classList.contains("app-ready") && appSidebar) {
        const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
        menuToggle.setAttribute("aria-expanded", String(!isExpanded));
        appSidebar.classList.toggle("is-open", !isExpanded);
        document.body.classList.toggle("drawer-open", !isExpanded);
        return;
      }
      const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!isExpanded));
      primaryNav.classList.toggle("is-open", !isExpanded);
    });
    primaryNav.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest("a")) {
        primaryNav.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // تعريف الصفحات ومسارات الروابط
  const viewDefinitions = [
    { id: "home", route: "home", title: "Home", selectors: ["#home", ".top-disclaimer", ".trust-strip"] },
    { id: "core-concepts", route: "core-concepts", title: "Core concepts", selectors: ["#core-concepts"] },
    { id: "symptoms-and-manifestations", route: "symptoms", title: "Symptoms and manifestations", selectors: ["#symptoms-and-manifestations"] },
    { id: "clinical-history-and-examination", route: "examination", title: "Clinical history and examination", selectors: ["#clinical-history-and-examination"] },
    { id: "differential-diagnosis", route: "differential", title: "Differential diagnosis", selectors: ["#differential-diagnosis"] },
    { id: "medications", route: "medications", title: "Medications", selectors: ["#medications"] },
    { id: "complications", route: "complications", title: "Complications", selectors: ["#complications"] },
    { id: "care-team-roles", route: "care-team", title: "Care team", selectors: ["#care-team-roles"] },
    {
      id: "about",
      route: "about",
      title: "Further reading and About",
      selectors: ["#guidelines-and-professional-resources", "#academic-supervisors", "#website-developer", "#references-and-further-reading"],
    },
  ];
  const routeAliases = new Map([
    ["symptoms-and-manifestations", "symptoms"],
    ["clinical-history-and-examination", "examination"],
    ["differential-diagnosis", "differential"],
    ["care-team-roles", "care-team"],
    ["guidelines-and-professional-resources", "about"],
    ["academic-supervisors", "about"],
    ["website-developer", "about"],
    ["references-and-further-reading", "about"],
  ]);
  const routeForSection = (section) => {
    if (!section) return null;
    return viewDefinitions.find((view) =>
      view.selectors.some((selector) => {
        const selected = document.querySelector(selector);
        return selected === section || selected?.contains(section) || section.contains(selected);
      }),
    ) || null;
  };
  const routePath = (view, sub = "") => `#/${view.route}${sub ? `/${encodeURIComponent(sub)}` : ""}`;

  const slugify = (value) =>
    value
      .toLocaleLowerCase("en")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  // إدارة البطاقات القابلة للتوسيع وروابطها
  const accordions = Array.from(document.querySelectorAll("main details"));
  const sectionFor = (details) => details.closest("section[id]");
  const usedIds = new Set(Array.from(document.querySelectorAll("[id]"), (element) => element.id));
  const pendingProgrammaticToggle = new WeakMap();

  const setAccordionOpen = (details, shouldOpen, preserveHash = false) => {
    if (preserveHash && details.open !== shouldOpen) {
      pendingProgrammaticToggle.set(details, shouldOpen);
    }
    details.open = shouldOpen;
    details.querySelector(":scope > summary")?.setAttribute("aria-expanded", String(shouldOpen));
  };

  accordions.forEach((details, index) => {
    const summary = details.querySelector(":scope > summary");
    if (!summary) return;

    if (!details.id) {
      const sectionId = sectionFor(details)?.id || "topic";
      const title = summary.querySelector("strong")?.textContent.trim() || summary.textContent.trim();
      const base = `${sectionId}-${slugify(title) || `topic-${index + 1}`}`;
      let candidate = base;
      let suffix = 2;
      while (usedIds.has(candidate)) candidate = `${base}-${suffix++}`;
      details.id = candidate;
      usedIds.add(candidate);
    }

    let content = details.querySelector(":scope > .disclosure-content");
    if (!content) {
      content = document.createElement("div");
      content.className = "disclosure-content";
      let child = summary.nextElementSibling;
      while (child) {
        const next = child.nextElementSibling;
        content.append(child);
        child = next;
      }
      details.append(content);
    }

    if (!content.id) content.id = `${details.id}-content`;
    summary.setAttribute("aria-controls", content.id);
    summary.setAttribute("aria-expanded", String(details.open));
    details.addEventListener("toggle", () => {
      summary.setAttribute("aria-expanded", String(details.open));
      if (pendingProgrammaticToggle.has(details)) {
        const expectedState = pendingProgrammaticToggle.get(details);
        pendingProgrammaticToggle.delete(details);
        if (details.open === expectedState) return;
      }
      const section = sectionFor(details);
      const view = routeForSection(section);
      if (document.body.classList.contains("app-ready") && view) {
        const activeRoute = location.hash.replace(/^#\//, "").split("/")[0];
        const routeKey = routeAliases.get(activeRoute) || activeRoute;
        const routeView = viewDefinitions.find((candidate) => candidate.route === routeKey);
        if (details.open) history.replaceState(null, "", routePath(view, details.id));
        else if (decodeURIComponent(location.hash.split("/").at(-1) || "") === details.id) {
          history.replaceState(null, "", routePath(routeView || view));
        }
      } else if (details.open) {
        history.replaceState(null, "", `#${encodeURIComponent(details.id)}`);
      } else if (decodeURIComponent(location.hash.slice(1)) === details.id) {
        history.replaceState(null, "", section ? `#${encodeURIComponent(section.id)}` : location.pathname);
      }
    });
  });

  // مسارات الأيقونات المستخدمة في بطاقات الموضوعات
  const topicIconPaths = {
    brain: ["M12 4.2a4.1 4.1 0 0 0-7.3 2.9 4 4 0 0 0-.3 7.2 4.2 4.2 0 0 0 6.2 4V5.2", "M12 4.2a4.1 4.1 0 0 1 7.3 2.9 4 4 0 0 1 .3 7.2 4.2 4.2 0 0 1-6.2 4V5.2"],
    motion: ["M3 12h4l3-8 4 16 3-8h4"],
    capsule: ["M5.6 18.4a4 4 0 0 1 0-5.7l7.1-7.1a4 4 0 0 1 5.7 5.7l-7.1 7.1a4 4 0 0 1-5.7 0Z", "m8.4 10.4 5.2 5.2"],
    clock: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z", "M12 7v5l3 2"],
    eye: ["M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z", "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"],
    pulse: ["M3 12h4l2-6 4 12 2-6h6"],
    people: ["M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20", "M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z", "M17 4a3.5 3.5 0 0 1 0 6.8", "M21 20v-1.5a4 4 0 0 0-3-3.9"],
    alert: ["M12 3 2.8 20h18.4L12 3Z", "M12 9v4", "M12 16.5h.01"],
    general: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z", "M12 8h.01", "M11 12h1v4h1"],
  };
  accordions.forEach((details) => {
    const icon = details.querySelector(":scope > summary .topic-icon");
    if (!icon) return;
    const title = details.querySelector(":scope > summary strong")?.textContent.toLowerCase() || "";
    const iconName = /pathophysiology|cognition|hallucination|reasoning|dementia|phenotype/.test(title)
      ? "brain"
      : /medication|levodopa|dopamine agonist|comt|mao|treatment|drug-induced/.test(title)
        ? "capsule"
        : /tremor|motor|bradykinesia|rigidity|gait|movement|postural|dyskinesia|freezing/.test(title)
          ? "motion"
          : /eye|visual|vision|saccade|gaze/.test(title)
            ? "eye"
            : /autonomic|orthostatic|urinary|constipation|sleep|mood|speech|swallow|sensory/.test(title)
              ? "pulse"
              : /history|course|progression|timing|onset|fluctuation/.test(title)
                ? "clock"
                : /team|nursing|physio|occupational|pharmacy|dietetics|care/.test(title)
                  ? "people"
                  : /red flag|caution|warning|falls|aspiration/.test(title)
                    ? "alert"
                    : "general";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    topicIconPaths[iconName].forEach((pathData) => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      svg.append(path);
    });
    icon.setAttribute("aria-hidden", "true");
    icon.replaceChildren(svg);
  });

  const detailsForHash = (hash) => {
    if (!hash) return null;
    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      return null;
    }
    const target = document.getElementById(id);
    return target instanceof HTMLDetailsElement ? target : target?.closest("details") || null;
  };

  const openHashTarget = () => {
    const details = detailsForHash(location.hash);
    if (!details) return;
    let parent = details;
    while (parent) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
      parent = parent.parentElement;
    }
    const summary = details.querySelector(":scope > summary");
    if (summary) summary.setAttribute("aria-expanded", "true");
  };
  openHashTarget();
  window.addEventListener("hashchange", openHashTarget);

  let activeAccordionSet = accordions;
  const setAllAccordions = (shouldOpen, preserveHash = false) => {
    activeAccordionSet.forEach((details) => {
      setAccordionOpen(details, shouldOpen, preserveHash);
    });
  };
  const accordionToggle = document.getElementById("accordionToggle");
  const updateAccordionToggle = () => {
    if (!accordionToggle) return;
    const allOpen = activeAccordionSet.length > 0 && activeAccordionSet.every((details) => details.open);
    accordionToggle.hidden = activeAccordionSet.length === 0;
    accordionToggle.setAttribute("aria-expanded", String(allOpen));
    accordionToggle.setAttribute("aria-label", allOpen ? "Collapse all topics in this view" : "Expand all topics in this view");
    accordionToggle.title = allOpen ? "Collapse all topics in this view" : "Expand all topics in this view";
    accordionToggle.innerHTML = allOpen
      ? '<svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M9 3v6H3m0-6 6 6m6-6v6h6m0-6-6 6M3 15h6v6m-6 0 6-6m12 0v6h-6m6 0-6-6"></path></svg>'
      : '<svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M8 3H3v5m0-5 6 6m7-6h5v5m0-5-6 6M3 16v5h5m-5 0 6-6m13 0v6h-5m5 0-6-6"></path></svg>';
  };
  accordionToggle?.addEventListener("click", () => {
    const shouldOpen = accordionToggle.getAttribute("aria-expanded") !== "true";
    setAllAccordions(shouldOpen, true);
    updateAccordionToggle();
  });
  accordions.forEach((details) => details.addEventListener("toggle", updateAccordionToggle));
  updateAccordionToggle();

  // إنشاء الرسوم التوضيحية التفاعلية
  const buildInteractiveDiagrams = () => {
    const pathwayFigure = document.querySelector("#core-concepts .diagram-card");
    const pathwaySource = document.querySelector("#core-concepts .topic-card .topic-content p:nth-of-type(2)");
    if (pathwayFigure && pathwaySource) {
      const diagramDescription = pathwayFigure.querySelector("desc")?.textContent.trim() || "";
      const diagramSentences = diagramDescription.replace(/^A schematic based on the page text:\s*/, "").match(/[^.]+(?:\.|$)/g) || [];
      const explorer = document.createElement("section");
      explorer.className = "diagram-explorer pathway-explorer";
      explorer.setAttribute("aria-labelledby", "pathwayExplorerTitle");
      const heading = document.createElement("h3");
      heading.id = "pathwayExplorerTitle";
      heading.textContent = "Explore the Pathophysiology";
      const explanation = document.createElement("p");
      explanation.className = "pathway-node-explanation";
      explanation.id = "pathwayNodeExplanation";
      explanation.setAttribute("aria-live", "polite");
      const states = [
        {
          title: "Normal state",
          dopamine: "Nigrostriatal dopamine",
          pathways: ["Direct pathway · movement-facilitating", "Indirect pathway · movement-suppressing"],
          outcome: "Movement facilitated and suppressed in balance",
          explanation: diagramSentences[0]?.trim() || diagramDescription,
        },
        {
          title: "Parkinson’s disease state",
          dopamine: "Reduced nigrostriatal dopamine",
          pathways: ["Direct pathway · relative underactivity", "Indirect pathway · relative overactivity"],
          outcome: "Reduced movement amplitude and speed",
          explanation: `${diagramSentences[1]?.trim() || diagramDescription} ${pathwaySource.textContent.trim()}`.trim(),
        },
      ];
      const stateGrid = document.createElement("div");
      stateGrid.className = "pathway-state-grid";
      stateGrid.setAttribute("aria-label", "Normal and Parkinson’s disease pathway states");
      const pathwayNodes = [];
      const makeNode = (labelText, explanationText, className) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `pathway-node ${className}`;
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("aria-controls", "pathwayNodeExplanation");
        button.textContent = labelText;
        button.addEventListener("click", () => {
          const wasExpanded = button.getAttribute("aria-expanded") === "true";
          pathwayNodes.forEach((node) => node.setAttribute("aria-expanded", "false"));
          button.setAttribute("aria-expanded", String(!wasExpanded));
          explanation.textContent = wasExpanded ? "" : explanationText;
        });
        pathwayNodes.push(button);
        return button;
      };
      states.forEach((state) => {
        const panel = document.createElement("section");
        panel.className = "pathway-state";
        const title = document.createElement("h4");
        title.textContent = state.title;
        const origin = makeNode(state.dopamine, state.explanation, "pathway-origin");
        const originConnector = document.createElement("span");
        originConnector.className = "pathway-state-connector";
        originConnector.setAttribute("aria-hidden", "true");
        originConnector.textContent = "↓";
        const branches = document.createElement("div");
        branches.className = "pathway-branches";
        state.pathways.forEach((pathway) => branches.append(makeNode(pathway, state.explanation, "pathway-branch")));
        const outcomeConnector = document.createElement("span");
        outcomeConnector.className = "pathway-state-connector";
        outcomeConnector.setAttribute("aria-hidden", "true");
        outcomeConnector.textContent = "↓";
        const outcome = makeNode(state.outcome, state.explanation, "pathway-outcome");
        panel.append(title, origin, originConnector, branches, outcomeConnector, outcome);
        stateGrid.append(panel);
      });
      const textAlternative = document.createElement("details");
      textAlternative.className = "diagram-text-alternative";
      const textSummary = document.createElement("summary");
      textSummary.textContent = "Show as text";
      const textCopy = document.createElement("div");
      textCopy.className = "pathway-text-copy";
      [diagramDescription, pathwaySource.textContent.trim()].filter(Boolean).forEach((text) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = text;
        textCopy.append(paragraph);
      });
      textAlternative.append(textSummary, textCopy);
      explorer.append(heading, stateGrid, explanation, textAlternative);
      pathwayFigure.before(explorer);
      pathwayFigure.hidden = true;
    }

    const medicationFigure = document.querySelector("#medications .medication-diagram-card");
    if (medicationFigure) {
      const map = document.createElement("section");
      map.className = "diagram-explorer medication-map";
      map.setAttribute("aria-labelledby", "medicationMapTitle");
      const heading = document.createElement("h3");
      heading.id = "medicationMapTitle";
      heading.textContent = "Medication mechanism map";
      const lanes = document.createElement("div");
      lanes.className = "medication-map-lanes";
      const descriptions = [
        ["carbidopa", "Peripheral tissues", "Carbidopa / benserazide", "Inhibit peripheral conversion of levodopa to dopamine."],
        ["levodopa", "Brain", "Levodopa", "Levodopa crosses into the brain and is converted to dopamine."],
        ["comt", "Peripheral tissues", "COMT inhibitors", "Reduce levodopa methylation; site varies by agent."],
        ["mao-b", "Brain", "MAO-B inhibitors", "Reduce dopamine breakdown."],
        ["agonist", "Brain", "Dopamine agonists", "Stimulate dopamine receptors."],
      ];
      const laneNodes = new Map();
      ["Peripheral tissues", "Brain"].forEach((laneName) => {
        const lane = document.createElement("section");
        lane.className = "medication-map-lane";
        const laneTitle = document.createElement("h4");
        laneTitle.textContent = laneName;
        lane.append(laneTitle);
        laneNodes.set(laneName, lane);
        lanes.append(lane);
      });
      const flow = document.createElement("p");
      flow.className = "medication-map-flow";
      flow.textContent = "Levodopa crosses into the brain";
      const selectedSummary = document.createElement("div");
      selectedSummary.className = "medication-map-summary";
      selectedSummary.setAttribute("aria-live", "polite");
      selectedSummary.setAttribute("aria-atomic", "true");
      const summaryTitle = document.createElement("strong");
      summaryTitle.textContent = "Select a medicine class to view its mechanism.";
      const summaryText = document.createElement("p");
      const cardLink = document.createElement("a");
      cardLink.hidden = true;
      cardLink.textContent = "Open full card";
      selectedSummary.append(summaryTitle, summaryText, cardLink);
      const textAlternative = document.createElement("details");
      textAlternative.className = "diagram-text-alternative";
      const textSummary = document.createElement("summary");
      textSummary.textContent = "Show as text";
      const textList = document.createElement("ul");
      descriptions.forEach(([, zone, labelText, detail]) => {
        const item = document.createElement("li");
        item.textContent = `${labelText} (${zone}): ${detail}`;
        textList.append(item);
      });
      textAlternative.append(textSummary, textList);
      descriptions.forEach(([kind, zone, labelText, detail]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "medication-map-node";
        button.dataset.class = kind === "carbidopa" ? "levodopa" : kind;
        button.setAttribute("aria-pressed", "false");
        button.textContent = labelText;
        const lane = laneNodes.get(zone);
        lane.append(button);
        button.addEventListener("click", () => {
          map.querySelectorAll(".medication-map-node").forEach((item) => item.setAttribute("aria-pressed", "false"));
          button.setAttribute("aria-pressed", "true");
          summaryTitle.textContent = labelText;
          summaryText.textContent = detail;
          const drugCard = Array.from(document.querySelectorAll("#medicationGrid .medication-card"))
            .find((card) => card.dataset.class === button.dataset.class);
          cardLink.hidden = !drugCard;
          if (drugCard) cardLink.href = routePath(viewDefinitions[5], drugCard.id);
        });
      });
      map.append(heading, lanes, flow, selectedSummary, textAlternative);
      medicationFigure.before(map);
      medicationFigure.hidden = true;
    }

    const reasoningCard = Array.from(document.querySelectorAll("#core-concepts .topic-card")).find((card) =>
      card.querySelector("strong")?.textContent.toLocaleLowerCase("en").includes("reasoning"),
    );
    const reasoningList = reasoningCard?.querySelector(".topic-content ol");
    if (reasoningCard && reasoningList) {
      const originalSteps = Array.from(reasoningList.querySelectorAll(":scope > li"), (item) => item.textContent.trim());
      const specialistText = document.querySelector("#differential-diagnosis .differential-red-flags li:last-child")?.textContent.trim();
      if (specialistText) originalSteps.push(specialistText);
      reasoningList.classList.add("reasoning-stepper");
      reasoningList.setAttribute("aria-label", "Clinical reasoning steps");
      reasoningList.replaceChildren();
      const stepButtons = [];
      const nextButton = document.createElement("button");
      nextButton.type = "button";
      nextButton.className = "reasoning-next";
      nextButton.textContent = "Next step";
      const updateStep = (activeIndex) => {
        Array.from(reasoningList.children).forEach((item, index) => {
          const active = index === activeIndex;
          if (active) item.setAttribute("aria-current", "step");
          else item.removeAttribute("aria-current");
          const copy = item.querySelector(".reasoning-step-copy");
          copy.hidden = !active;
          const button = item.querySelector("button");
          button.setAttribute("aria-expanded", String(active));
        });
        nextButton.disabled = activeIndex >= originalSteps.length - 1;
        nextButton.dataset.activeStep = String(activeIndex);
      };
      originalSteps.forEach((copyText, index) => {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "reasoning-step-button";
        button.setAttribute("aria-expanded", "false");
        button.textContent = index === originalSteps.length - 1 ? "Specialist input" : `Step ${index + 1}`;
        const copy = document.createElement("p");
        copy.className = "reasoning-step-copy";
        copy.textContent = copyText;
        button.addEventListener("click", () => updateStep(index));
        item.append(button, copy);
        reasoningList.append(item);
        stepButtons.push(button);
      });
      nextButton.addEventListener("click", () => {
        const next = Math.min(Number(nextButton.dataset.activeStep || 0) + 1, originalSteps.length - 1);
        updateStep(next);
        stepButtons[next]?.focus();
      });
      reasoningList.after(nextButton);
      updateStep(0);
    }
  };

  // بناء أداة مقارنة التشخيص التفريقي
  const buildDifferentialTool = () => {
    const table = document.querySelector("#differential-diagnosis .comparison-table");
    const section = document.getElementById("differential-diagnosis");
    if (!table || !section) return;
    const headers = Array.from(table.querySelectorAll("thead th"), (cell) => cell.textContent.trim());
    const records = Array.from(table.querySelectorAll("tbody tr")).map((row) => {
      const cells = Array.from(row.children, (cell) => cell.textContent.trim());
      return {
        name: cells[0],
        attributes: headers.slice(1, -1).map((label, index) => ({ label, value: cells[index + 1] })).filter((item) => item.value && item.value !== "—"),
        clue: cells.at(-1) === "—" ? "" : cells.at(-1),
        text: `${row.textContent} ${findConditionCard(cells[0])?.textContent || ""}`.toLocaleLowerCase("en"),
      };
    });
    if (!records.length) return;
    table.closest(".table-wrap").hidden = true;
    const tool = document.createElement("section");
    tool.className = "comparison-tool";
    tool.id = "differentialCompareTool";
    tool.setAttribute("aria-labelledby", "conditionCompareTitle");
    const heading = document.createElement("h3");
    heading.id = "conditionCompareTitle";
    heading.textContent = "Compare conditions";
    const intro = document.createElement("p");
    intro.textContent = "Choose two or three conditions. Only features stated in this resource are shown.";
    const picker = document.createElement("fieldset");
    picker.className = "condition-picker";
    const legend = document.createElement("legend");
    legend.textContent = "Select 2–3 conditions";
    picker.append(legend);
    const selected = new Set([records[0].name, records[1]?.name].filter(Boolean));
    const compareGrid = document.createElement("div");
    compareGrid.className = "condition-comparison-grid";
    const clues = document.createElement("div");
    clues.className = "condition-clue-grid";
    const redFlag = document.createElement("section");
    redFlag.className = "red-flag-finder";
    redFlag.id = "redFlagFinder";
    redFlag.setAttribute("aria-labelledby", "redFlagFinderTitle");
    const redTitle = document.createElement("h3");
    redTitle.id = "redFlagFinderTitle";
    redTitle.textContent = "Red flag finder";
    const redIntro = document.createElement("p");
    redIntro.textContent = "Select observed features to see which condition clue lists mention them. This is not a diagnosis.";
    const featureList = document.createElement("fieldset");
    featureList.className = "red-flag-options";
    const featureLegend = document.createElement("legend");
    featureLegend.textContent = "Observed features";
    featureList.append(featureLegend);
    const flagResult = document.createElement("p");
    flagResult.className = "red-flag-result";
    flagResult.setAttribute("role", "status");
    flagResult.setAttribute("aria-live", "polite");
    const featureDefinitions = [
      ["Early unexplained falls", ["early unexplained falls"]],
      ["Vertical gaze limitation", ["vertical gaze palsy", "slowed vertical saccades"]],
      ["Prominent or early autonomic failure", ["prominent or early autonomic failure"]],
      ["Cerebellar signs", ["cerebellar signs"]],
      ["Visual hallucinations or dementia near onset", ["recurrent visual hallucinations", "dementia before or around onset"]],
      ["Urinary retention", ["urinary retention"]],
      ["Broad-based or magnetic gait with ventriculomegaly", ["broad-based or magnetic gait with ventriculomegaly"]],
      ["Postural and kinetic tremor", ["typically postural and kinetic"]],
      ["Onset after medicine initiation or dose escalation", ["onset after medicine initiation or dose escalation"]],
      ["Vascular burden, stepwise decline, or lower-body involvement", ["vascular burden", "stepwise", "lower-body involvement"]],
      ["Limb apraxia or cortical sensory loss", ["limb apraxia", "cortical sensory loss"]],
    ];
    const featureCheckboxes = [];
    featureDefinitions.forEach(([label, phrases], index) => {
      const wrapper = document.createElement("label");
      wrapper.className = "red-flag-option";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `redFlagFeature-${index + 1}`;
      const text = document.createElement("span");
      text.textContent = label;
      wrapper.append(checkbox, text);
      featureList.append(wrapper);
      featureCheckboxes.push({ checkbox, label, phrases });
      checkbox.addEventListener("change", updateRedFlags);
    });
    function updateComparison() {
      const active = records.filter((record) => selected.has(record.name));
      compareGrid.replaceChildren();
      const rows = Array.from(new Set(active.flatMap((record) => record.attributes.map((item) => item.label))));
      active.forEach((record) => {
        const card = document.createElement("article");
        card.className = "condition-comparison-card";
        const title = document.createElement("h4");
        title.textContent = record.name;
        const list = document.createElement("dl");
        record.attributes.filter((item) => rows.includes(item.label)).forEach((item) => {
          const term = document.createElement("dt");
          term.textContent = item.label;
          const value = document.createElement("dd");
          value.textContent = item.value;
          list.append(term, value);
        });
        card.append(title, list);
        compareGrid.append(card);
      });
      clues.replaceChildren();
      const clueHeading = document.createElement("h3");
      clueHeading.textContent = "Distinguishing clues";
      clues.append(clueHeading);
      records.filter((record) => record.clue).forEach((record) => {
        const card = document.createElement("article");
        card.className = "condition-clue-card";
        const title = document.createElement("h4");
        title.textContent = record.name;
        const clue = document.createElement("p");
        clue.textContent = record.clue;
        const target = findConditionCard(record.name);
        const link = document.createElement("a");
        const targetView = routeForSection(target?.closest("section[id]")) || viewDefinitions[4];
        link.href = routePath(targetView, target?.id || "");
        link.textContent = "Open full condition card";
        card.append(title, clue, link);
        clues.append(card);
      });
    }
    function updateRedFlags() {
      const activeFeatures = featureCheckboxes.filter(({ checkbox }) => checkbox.checked);
      const matches = records.filter((record) =>
        activeFeatures.some(({ phrases }) => phrases.some((phrase) => record.text.includes(phrase))),
      );
      flagResult.textContent = !activeFeatures.length
        ? "Select one or more observed features."
        : matches.length
          ? `These features may point toward ${matches.map((record) => record.name).join(", ")}; consider the full clinical pattern.`
          : "No selected condition clue lists mention these features; consider the full clinical pattern and other explanations.";
    }
    function findConditionCard(name) {
      const normalizedName = name.toLocaleLowerCase("en");
      const aliases = normalizedName.includes("drug-induced") ? ["drug-induced parkinsonism"]
        : normalizedName.includes("vascular") ? ["vascular parkinsonism"]
          : normalizedName.includes("progressive supranuclear") ? ["progressive supranuclear palsy"]
            : normalizedName.includes("multiple system") ? ["multiple system atrophy"]
              : normalizedName.includes("dementia with lewy") ? ["dementia with lewy bodies"]
                : normalizedName.includes("normal-pressure") ? ["hydrocephalus"]
                  : normalizedName.includes("corticobasal") ? ["corticobasal syndrome"]
                    : normalizedName.includes("essential tremor") ? ["essential tremor"]
                      : normalizedName.includes("parkinson") ? ["definition and pathophysiology"]
                        : [];
      const cards = Array.from(document.querySelectorAll("#differential-diagnosis .topic-card"));
      return cards.find((card) => {
        const cardTitle = card.querySelector(":scope > summary strong")?.textContent.toLocaleLowerCase("en") || "";
        return aliases.some((alias) => cardTitle.includes(alias));
      })
        || (normalizedName.includes("parkinson") ? document.querySelector("#core-concepts .topic-card") : null);
    }
    records.forEach((record, index) => {
      const label = document.createElement("label");
      label.className = "condition-chip";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = record.name;
      checkbox.checked = selected.has(record.name);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked && selected.size >= 3) {
          checkbox.checked = false;
          return;
        }
        if (checkbox.checked) selected.add(record.name);
        else if (selected.size > 2) selected.delete(record.name);
        else checkbox.checked = true;
        updateComparison();
      });
      const text = document.createElement("span");
      text.textContent = record.name;
      label.append(checkbox, text);
      picker.append(label);
    });
    redFlag.append(redTitle, redIntro, featureList, flagResult);
    tool.append(heading, intro, picker, compareGrid, clues, redFlag);
    table.closest(".table-wrap").before(tool);
    updateComparison();
    updateRedFlags();
  };

  // بناء أداة مقارنة فئات الأدوية
  const buildMedicationComparison = () => {
    const table = document.querySelector("#medications .medication-comparison");
    const tableWrap = table?.closest(".table-wrap");
    if (!table || !tableWrap) return;
    const labels = Array.from(table.querySelectorAll("thead th"), (cell) => cell.textContent.trim());
    const detailCards = Array.from(document.querySelectorAll("#medications .medication-card"));
    const records = Array.from(table.querySelectorAll("tbody tr")).map((row, index) => {
      const values = Array.from(row.children, (cell) => cell.textContent.trim());
      const detail = detailCards[index];
      return {
        name: values[0],
        cells: labels.slice(1).map((label, cellIndex) => ({ label, value: values[cellIndex + 1] })),
        class: detail?.dataset.class || "",
        mechanism: detail?.dataset.mechanism || "",
        effects: detail?.dataset.effects || "",
        searchable: `${values.join(" ")} ${detail?.textContent || ""}`.toLocaleLowerCase("en"),
      };
    });
    if (!records.length) return;
    tableWrap.hidden = true;
    const tool = document.createElement("section");
    tool.className = "medication-comparison-tool";
    tool.id = "medicationComparisonTool";
    tool.setAttribute("aria-labelledby", "medicationCompareTitle");
    const title = document.createElement("h3");
    title.id = "medicationCompareTitle";
    title.textContent = "Medication class comparison";
    const controls = document.createElement("div");
    controls.className = "medication-compare-controls";
    const sortLabel = document.createElement("label");
    sortLabel.textContent = "Sort classes";
    const sort = document.createElement("select");
    sort.className = "medication-sort";
    sortLabel.append(sort);
    [["class", "Class name"], ["role", "Main role"]].forEach(([value, text]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      sort.append(option);
    });
    const comparePicker = document.createElement("fieldset");
    comparePicker.className = "medication-compare-picker";
    const compareLegend = document.createElement("legend");
    compareLegend.textContent = "Compare two classes";
    comparePicker.append(compareLegend);
    const compareSelects = [];
    [0, 1].forEach((index) => {
      const label = document.createElement("label");
      label.textContent = index === 0 ? "First class" : "Second class";
      const select = document.createElement("select");
      select.setAttribute("aria-label", label.textContent);
      records.forEach((record) => {
        const option = document.createElement("option");
        option.value = record.name;
        option.textContent = record.name;
        select.append(option);
      });
      if (index === 1 && records[1]) select.value = records[1].name;
      select.addEventListener("change", renderClassComparison);
      label.append(select);
      comparePicker.append(label);
      compareSelects.push(select);
    });
    const compareGrid = document.createElement("div");
    compareGrid.className = "medication-class-comparison";
    const cards = document.createElement("div");
    cards.className = "medication-comparison-cards";
    const empty = document.createElement("p");
    empty.className = "medication-comparison-empty";
    empty.textContent = "No medication classes match the current search or filters.";
    empty.hidden = true;
    sort.addEventListener("change", renderSortedCards);
    function renderSortedCards() {
      const key = sort.value === "role" ? records[0].cells[1].label : "name";
      const sorted = [...records].sort((left, right) => {
        const leftValue = key === "name" ? left.name : left.cells.find((cell) => cell.label === key)?.value || "";
        const rightValue = key === "name" ? right.name : right.cells.find((cell) => cell.label === key)?.value || "";
        return leftValue.localeCompare(rightValue);
      });
      sorted.forEach((record) => {
        const card = Array.from(cards.children).find((candidate) => candidate.dataset.recordName === record.name);
        if (card) cards.append(card);
      });
    }
    function renderClassComparison() {
      compareGrid.replaceChildren();
      const active = compareSelects.map((select) => records.find((record) => record.name === select.value)).filter(Boolean);
      active.forEach((record) => {
        const card = document.createElement("article");
        card.className = "medication-compare-card";
        const heading = document.createElement("h4");
        heading.textContent = record.name;
        const list = document.createElement("dl");
        record.cells.forEach(({ label, value }) => {
          if (!value || value === "—") return;
          const term = document.createElement("dt");
          term.textContent = label;
          const description = document.createElement("dd");
          description.textContent = value;
          list.append(term, description);
        });
        card.append(heading, list);
        compareGrid.append(card);
      });
    }
    records.forEach((record) => {
      const card = document.createElement("article");
      card.className = "medication-comparison-card";
      card.dataset.recordName = record.name;
      card.dataset.class = record.class;
      card.dataset.mechanism = record.mechanism;
      card.dataset.effects = record.effects;
      card.dataset.searchable = record.searchable;
      const heading = document.createElement("h4");
      heading.textContent = record.name;
      const list = document.createElement("dl");
      record.cells.forEach(({ label, value }) => {
        if (!value || value === "—") return;
        const term = document.createElement("dt");
        term.textContent = label;
        const description = document.createElement("dd");
        description.textContent = value;
        list.append(term, description);
      });
      card.append(heading, list);
      cards.append(card);
    });
    controls.append(sortLabel);
    comparePicker.append(compareGrid);
    tool.append(title, controls, comparePicker, cards, empty);
    tableWrap.before(tool);
    renderClassComparison();
  };
  buildInteractiveDiagrams();
  buildDifferentialTool();
  buildMedicationComparison();

  // التحكم في خطوات الفحص السريري
  const setExaminationStep = (() => {
    const section = document.getElementById("clinical-history-and-examination");
    const grid = section?.querySelector(".topic-grid");
    if (!grid) return () => {};
    const stepCards = Array.from(grid.querySelectorAll(":scope > .topic-card"))
      .filter((card) => !/history-taking|investigations and diagnostic criteria/i.test(
        card.querySelector(":scope > summary strong")?.textContent || "",
      ));
    if (!stepCards.length) return () => {};

    const stepper = document.createElement("nav");
    stepper.className = "examination-stepper";
    stepper.setAttribute("aria-label", "Examination steps");
    const stepList = document.createElement("ol");
    stepList.className = "examination-step-list";
    const stepButtons = [];
    let activeStep = 0;

    const activateStep = (stepIndex) => {
      activeStep = Math.max(0, Math.min(stepIndex, stepCards.length - 1));
      stepCards.forEach((card, index) => {
        card.hidden = index !== activeStep;
        if (index === activeStep) card.dataset.examStep = String(index + 1);
        else card.removeAttribute("data-exam-step");
      });
      setAccordionOpen(stepCards[activeStep], true, true);
      stepList.querySelectorAll("li").forEach((item, index) => {
        if (index === activeStep) item.setAttribute("aria-current", "step");
        else item.removeAttribute("aria-current");
      });
      stepButtons.forEach((button, index) => {
        button.setAttribute("aria-pressed", String(index === activeStep));
      });
      previousButton.disabled = activeStep === 0;
      nextButton.disabled = activeStep === stepCards.length - 1;
    };

    stepCards.forEach((card, index) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `Step ${index + 1}`;
      button.setAttribute("aria-controls", card.id);
      button.setAttribute("aria-pressed", "false");
      item.append(button);
      stepList.append(item);
      stepButtons.push(button);
    });

    const stepControls = document.createElement("div");
    stepControls.className = "examination-step-controls";
    const previousButton = document.createElement("button");
    previousButton.type = "button";
    previousButton.textContent = "Previous step";
    const stepStatus = document.createElement("span");
    stepStatus.setAttribute("aria-live", "polite");
    stepStatus.className = "visually-hidden";
    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.textContent = "Next step";
    stepControls.append(previousButton, stepStatus, nextButton);

    const originalActivateStep = activateStep;
    const announceAndActivate = (stepIndex) => {
      originalActivateStep(stepIndex);
      stepStatus.textContent = `Examination step ${activeStep + 1} of ${stepCards.length}: ${stepCards[activeStep].querySelector(":scope > summary strong")?.textContent || ""}`;
    };
    stepButtons.forEach((button, index) => {
      button.addEventListener("click", () => announceAndActivate(index));
    });
    previousButton.addEventListener("click", () => announceAndActivate(activeStep - 1));
    nextButton.addEventListener("click", () => announceAndActivate(activeStep + 1));

    stepper.append(stepList, stepControls);
    grid.before(stepper);
    activateStep(0);
    stepStatus.textContent = `Examination step 1 of ${stepCards.length}: ${stepCards[0].querySelector(":scope > summary strong")?.textContent || ""}`;

    return (target) => {
      const stepIndex = stepCards.indexOf(target);
      if (stepIndex >= 0) announceAndActivate(stepIndex);
    };
  })();

  // إعداد التنقل بين الصفحات ولوحة تقدم المستخدم
  const setupViewRouter = () => {
    const main = document.getElementById("main");
    const sidebarNav = document.getElementById("sidebarNav");
    const subnav = document.getElementById("sidebarSubnav");
    const mobileNav = document.getElementById("mobileViewNav");
    const announcement = document.getElementById("viewAnnouncement");
    const progressCount = document.getElementById("progressCount");
    const progressList = document.getElementById("progressList");
    const primaryNavigation = document.getElementById("primaryNav");
    const mobilePrevious = document.getElementById("mobilePrevious");
    const mobileNext = document.getElementById("mobileNext");
    const mobileCurrent = document.getElementById("mobileCurrentView");
    if (!main || !sidebarNav || !appSidebar || !primaryNavigation) return;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    const views = viewDefinitions.map((view) => ({
      ...view,
      elements: view.selectors.map((selector) => document.querySelector(selector)).filter(Boolean),
    }));
    const viewByRoute = new Map(views.map((view) => [view.route, view]));
    routeAliases.forEach((canonical, alias) => {
      const view = viewByRoute.get(canonical);
      if (view) viewByRoute.set(alias, view);
    });
    const legacyIdToView = new Map();
    views.forEach((view) => view.elements.forEach((element) => {
      legacyIdToView.set(element.id, view);
    }));

    const primaryLinks = Array.from(primaryNavigation.querySelectorAll("a[href^='#']"));
    const sidebarLinks = new Map();
    views.forEach((view) => {
      const link = document.createElement("a");
      link.href = routePath(view);
      link.textContent = view.title;
      link.dataset.viewRoute = view.route;
      sidebarNav.append(link);
      sidebarLinks.set(view.route, link);
    });
    views.forEach((view, index) => {
      const lastElement = view.elements.at(-1);
      if (!lastElement) return;
      const pagination = document.createElement("nav");
      pagination.className = "view-pagination";
      pagination.setAttribute("aria-label", `${view.title} section navigation`);
      if (index > 0) {
        const previous = document.createElement("a");
        previous.href = routePath(views[index - 1]);
        previous.textContent = `← Previous: ${views[index - 1].title}`;
        pagination.append(previous);
      }
      if (index < views.length - 1) {
        const next = document.createElement("a");
        next.href = routePath(views[index + 1]);
        next.textContent = `Next: ${views[index + 1].title} →`;
        pagination.append(next);
      }
      lastElement.append(pagination);
    });
    primaryLinks.forEach((link) => {
      const id = decodeURIComponent(link.hash.slice(1));
      const view = legacyIdToView.get(id) || viewDefinitions.find((item) => item.id === id);
      if (view) link.href = routePath(view);
    });

    const visitedKey = "parkinsons-learning-visited-v1";
    let visited = new Set();
    try {
      const stored = JSON.parse(localStorage.getItem(visitedKey) || "[]");
      if (Array.isArray(stored)) visited = new Set(stored.filter((id) => views.some((view) => view.route === id)));
    } catch {
      visited = new Set();
    }

    const renderProgress = () => {
      if (!progressList || !progressCount) return;
      progressList.replaceChildren();
      views.forEach((view) => {
        const item = document.createElement("li");
        const marker = document.createElement("span");
        marker.setAttribute("aria-hidden", "true");
        marker.textContent = visited.has(view.route) ? "✓" : "○";
        const label = document.createElement("span");
        label.textContent = `${view.title}${visited.has(view.route) ? " — visited" : ""}`;
        item.append(marker, label);
        progressList.append(item);
      });
      progressCount.textContent = `${visited.size} of ${views.length} viewed`;
      try {
        localStorage.setItem(visitedKey, JSON.stringify(Array.from(visited)));
      } catch {
        return;
      }
    };

    const subItemsFor = (view) => {
      if (view.route === "home") return [];
      if (view.route === "core-concepts") {
        return [
          ["Definition", "definition"],
          ["Phenotype and course", "phenotype-and-course"],
          ["Reasoning framework", "reasoning-framework"],
        ];
      }
      if (view.route === "symptoms") {
        return [
          ["Motor", "motor"],
          ["Non-motor", "non-motor"],
          ["Fluctuations", "fluctuations"],
        ];
      }
      if (view.route === "examination") {
        return [
          ["History", "history"],
          ...Array.from({ length: 6 }, (_, index) => [`Exam step ${index + 1}`, `step-${index + 1}`]),
          ["Investigations", "investigations"],
        ];
      }
      if (view.route === "differential") {
        return [
          ["Compare conditions", "compare"],
          ["Conditions", "conditions"],
          ["Red flags", "red-flags"],
          ["Self-check", "self-check"],
        ];
      }
      if (view.route === "medications") {
        return [
          ["Overview", "overview"],
          ["Mechanism map", "mechanism-map"],
          ["Compare", "compare"],
          ["Drug cards", "drug-cards"],
          ["Self-check", "self-check"],
        ];
      }
      return view.elements.flatMap((element) =>
        Array.from(element.querySelectorAll(".topic-card, .self-check-item")).map((details) => {
          const summary = details.querySelector(":scope > summary");
          return [summary?.querySelector("strong")?.textContent.trim() || summary?.textContent.trim() || "Topic", details.id];
        }),
      );
    };

    const selectorForSubroute = (view, subroute) => {
      if (!subroute) return null;
      const fixedTargets = {
        "differential:compare": "#differentialCompareTool",
        "differential:conditions": "#differential-diagnosis .topic-grid",
        "differential:red-flags": "#differential-diagnosis .differential-red-flags",
        "differential:self-check": "#differential-diagnosis .self-check",
        "medications:overview": "#medications .key-points",
        "medications:mechanism-map": "#medications .medication-diagram-card",
        "medications:compare": "#medicationComparisonTool",
        "medications:drug-cards": "#medicationGrid",
        "medications:self-check": "#medications .self-check",
      };
      if (fixedTargets[`${view.route}:${subroute}`]) return document.querySelector(fixedTargets[`${view.route}:${subroute}`]);
      const titleTerms = {
        "core-concepts:definition": "definition and pathophysiology",
        "core-concepts:phenotype-and-course": "clinical phenotype and course",
        "core-concepts:reasoning-framework": "clinical reasoning framework",
        "symptoms:motor": "motor features",
        "symptoms:non-motor": "non-motor features",
        "symptoms:fluctuations": "fluctuations and dyskinesia",
        "examination:history": "history-taking",
        "examination:investigations": "investigations and diagnostic criteria",
      };
      const examStep = subroute.match(/^step-([1-6])$/);
      const wantedTitle = titleTerms[`${view.route}:${subroute}`]
        || (examStep ? ["general observation and speech", "bradykinesia examination", "tone and rigidity", "tremor assessment", "gait, turning, and postural responses", "additional neurological and functional examination"][Number(examStep[1]) - 1] : "");
      if (wantedTitle) {
        return Array.from(view.elements[0]?.querySelectorAll(".topic-card") || [])
          .find((card) => card.querySelector(":scope > summary strong")?.textContent.toLocaleLowerCase("en").includes(wantedTitle))
          || null;
      }
      return document.getElementById(subroute);
    };

    const updateHeadings = (view) => {
      main.querySelectorAll("h1[data-route-heading]").forEach((heading) => {
        const restored = document.createElement("h2");
        restored.innerHTML = heading.innerHTML;
        restored.className = heading.className;
        if (heading.id) restored.id = heading.id;
        heading.replaceWith(restored);
      });
      if (view.route === "home") {
        const homeHeading = document.getElementById("heroTitle");
        homeHeading?.setAttribute("tabindex", "-1");
        return homeHeading;
      }
      const heading = view.elements[0]?.querySelector(".section-heading h2");
      if (!heading) return null;
      const mainHeading = document.createElement("h1");
      mainHeading.innerHTML = heading.innerHTML;
      mainHeading.className = heading.className;
      mainHeading.id = heading.id;
      mainHeading.tabIndex = -1;
      mainHeading.dataset.routeHeading = "true";
      heading.replaceWith(mainHeading);
      return mainHeading;
    };

    const updateSubnav = (view, selectedSubroute) => {
      if (!subnav) return;
      subnav.replaceChildren();
      const entries = subItemsFor(view);
      if (!entries.length) {
        subnav.hidden = true;
        return;
      }
      const heading = document.createElement("h2");
      heading.textContent = "In this view";
      subnav.append(heading);
      entries.forEach(([label, subroute]) => {
        const link = document.createElement("a");
        link.href = routePath(view, subroute);
        link.textContent = label;
        if (selectedSubroute === subroute) link.setAttribute("aria-current", "location");
        subnav.append(link);
      });
      subnav.hidden = false;
    };

    const parseLocation = () => {
      if (location.hash.startsWith("#/")) {
        const [rawRoute, ...parts] = location.hash.slice(2).split("/");
        const route = routeAliases.get(rawRoute) || rawRoute;
        return { view: viewByRoute.get(route) || viewByRoute.get("home"), subroute: parts.map(decodeURIComponent).join("/") };
      }
      const raw = decodeURIComponent(location.hash.slice(1));
      if (!raw) return { view: viewByRoute.get("home"), subroute: "" };
      const target = document.getElementById(raw);
      const detail = target instanceof HTMLDetailsElement ? target : target?.closest("details");
      const section = detail?.closest("section[id]") || target?.closest("section[id]") || target;
      const definition = routeForSection(section);
      const view = viewByRoute.get(definition?.route) || legacyIdToView.get(raw) || viewByRoute.get("home");
      return { view, subroute: detail?.id || "" };
    };

    let currentRoute = null;
    const navigateToLocation = (shouldFocus = true) => {
      const { view, subroute } = parseLocation();
      const routeIndex = views.indexOf(view);
      activeAccordionSet = accordions.filter((details) => view.elements.some((element) => element.contains(details)));
      updateAccordionToggle();
      views.forEach((candidate) => {
        candidate.elements.forEach((element) => {
          element.hidden = candidate !== view;
        });
      });
      document.body.classList.add("app-ready");
      primaryNavigation.hidden = true;
      appSidebar.hidden = false;
      const isMobile = window.matchMedia("(max-width: 1050px)").matches;
      appSidebar.classList.toggle("is-open", !isMobile);
      document.body.classList.toggle("drawer-open", false);
      menuToggle?.setAttribute("aria-expanded", String(!isMobile));
      menuToggle?.setAttribute("aria-controls", "appSidebar");
      mobileNav?.removeAttribute("hidden");
      if (mobilePrevious && routeIndex > 0) {
        mobilePrevious.href = routePath(views[routeIndex - 1]);
        mobilePrevious.hidden = false;
      } else if (mobilePrevious) mobilePrevious.hidden = true;
      if (mobileNext && routeIndex < views.length - 1) {
        mobileNext.href = routePath(views[routeIndex + 1]);
        mobileNext.hidden = false;
      } else if (mobileNext) mobileNext.hidden = true;
      if (mobileCurrent) mobileCurrent.textContent = `${view.title} · ${routeIndex + 1} of ${views.length}`;
      views.forEach((candidate) => {
        const link = sidebarLinks.get(candidate.route);
        if (candidate === view) link?.setAttribute("aria-current", "page");
        else link?.removeAttribute("aria-current");
      });
      const heading = updateHeadings(view);
      updateSubnav(view, subroute);
      visited.add(view.route);
      renderProgress();
      document.title = `${view.title} | Parkinson’s Clinical Learning Resource`;
      if (currentRoute !== view.route) {
        if (announcement) announcement.textContent = `${view.title}, view ${routeIndex + 1} of ${views.length}`;
        currentRoute = view.route;
      }
      const target = selectorForSubroute(view, subroute);
      const scrollToRouteTarget = (element) => {
        const scrollMargin = Number.parseFloat(getComputedStyle(element).scrollMarginTop) || 0;
        const top = window.scrollY + element.getBoundingClientRect().top - scrollMargin;
        window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
      };
      let routeScrollTarget = null;
      if (target instanceof HTMLDetailsElement) {
        if (view.route === "examination") setExaminationStep(target);
        setAccordionOpen(target, true, true);
        routeScrollTarget = target;
      } else if (target && subroute) {
        routeScrollTarget = target;
      }
      if (shouldFocus) (target?.querySelector?.(":scope > summary") || heading)?.focus({ preventScroll: true });
      const navigationHash = location.hash;
      requestAnimationFrame(() => {
        if (location.hash !== navigationHash) return;
        if (routeScrollTarget) scrollToRouteTarget(routeScrollTarget);
        else window.scrollTo({ top: 0, behavior: "instant" });
      });
    };
    sidebarNav.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a[href^='#/']");
      if (!link) return;
      appSidebar.classList.remove("is-open");
      document.body.classList.remove("drawer-open");
      menuToggle?.setAttribute("aria-expanded", "false");
    });
    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Node)) return;
      if (!appSidebar.classList.contains("is-open")) return;
      if (appSidebar.contains(event.target) || menuToggle?.contains(event.target)) return;
      appSidebar.classList.remove("is-open");
      document.body.classList.remove("drawer-open");
      menuToggle?.setAttribute("aria-expanded", "false");
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !appSidebar.classList.contains("is-open")) return;
      appSidebar.classList.remove("is-open");
      document.body.classList.remove("drawer-open");
      menuToggle?.setAttribute("aria-expanded", "false");
      menuToggle?.focus();
    });
    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a[href^='#']");
      if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const hash = link.getAttribute("href") || "";
      let route = "";
      if (hash.startsWith("#/")) route = hash;
      else {
        let id = hash.slice(1);
        try { id = decodeURIComponent(id); } catch { return; }
        const target = document.getElementById(id);
        if (!target) return;
        const detail = target instanceof HTMLDetailsElement ? target : target.closest("details");
        const view = routeForSection(detail?.closest("section[id]") || target.closest("section[id]") || target);
        if (!view) return;
        route = routePath(view, detail?.id || "");
      }
      event.preventDefault();
      if (location.hash === route) navigateToLocation();
      else location.hash = route;
    });
    document.getElementById("resetProgress")?.addEventListener("click", () => {
      visited.clear();
      renderProgress();
    });
    document.getElementById("themeToggle")?.addEventListener("click", (event) => {
      const button = event.currentTarget;
      const dark = document.documentElement.dataset.theme !== "dark";
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      button.setAttribute("aria-pressed", String(dark));
      button.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
      button.title = dark ? "Switch to light theme" : "Switch to dark theme";
      try { localStorage.setItem("parkinsons-learning-theme-v1", dark ? "dark" : "light"); } catch { return; }
    });
    const themeToggle = document.getElementById("themeToggle");
    let preferredTheme = "";
    try { preferredTheme = localStorage.getItem("parkinsons-learning-theme-v1") || ""; } catch { preferredTheme = ""; }
    const initialTheme = preferredTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = initialTheme;
    themeToggle?.setAttribute("aria-pressed", String(initialTheme === "dark"));
    themeToggle?.setAttribute("aria-label", initialTheme === "dark" ? "Switch to light theme" : "Switch to dark theme");
    if (themeToggle) themeToggle.title = initialTheme === "dark" ? "Switch to light theme" : "Switch to dark theme";
    window.addEventListener("hashchange", () => navigateToLocation());
    window.addEventListener("resize", () => {
      if (appSidebar.hidden) return;
      const mobile = window.matchMedia("(max-width: 1050px)").matches;
      appSidebar.classList.toggle("is-open", !mobile);
      menuToggle?.setAttribute("aria-expanded", String(!mobile));
      document.body.classList.remove("drawer-open");
      if (mobile) appSidebar.classList.remove("is-open");
    });
    renderProgress();
    navigateToLocation(false);
  };
  setupViewRouter();

  // فتح محتوى البطاقات للطباعة ثم استعادة حالته
  let printAccordionState = null;
  window.addEventListener("beforeprint", () => {
    printAccordionState = accordions.map((details) => details.open);
    accordions.forEach((details) => setAccordionOpen(details, true, true));
  });
  window.addEventListener("afterprint", () => {
    if (!printAccordionState) return;
    accordions.forEach((details, index) => {
      setAccordionOpen(details, printAccordionState[index], true);
    });
    printAccordionState = null;
  });

  // البحث العام والاقتراحات وتمييز النتائج
  const normalize = (value) =>
    value
      .toLocaleLowerCase("en")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const searchForm = document.getElementById("globalSearchForm");
  const globalSearch = document.getElementById("globalSearch");
  const searchResults = document.getElementById("searchResults");
  const clearGlobalSearch = document.getElementById("clearGlobalSearch");
  const searchAliases = {
    pd: ["parkinson's disease", "parkinson disease"],
    et: ["essential tremor"],
    dip: ["drug-induced parkinsonism", "drug induced parkinsonism"],
    psp: ["progressive supranuclear palsy"],
    msa: ["multiple system atrophy"],
    dlb: ["dementia with lewy bodies"],
    nph: ["normal-pressure hydrocephalus", "normal pressure hydrocephalus"],
    oh: ["orthostatic hypotension"],
    rbd: ["rem sleep behavior disorder"],
    "l-dopa": ["levodopa"],
    levodopa: ["l-dopa"],
    comt: ["catechol-o-methyltransferase"],
    "mao-b": ["monoamine oxidase b"],
    "wearing-off": ["wearing off", "off period"],
  };

  const clearHighlights = () => {
    document.querySelectorAll("#main mark.search-highlight").forEach((mark) => {
      const parent = mark.parentNode;
      mark.replaceWith(document.createTextNode(mark.textContent || ""));
      parent?.normalize();
    });
  };

  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tokenize = (value) => normalize(value).split(/[\s-]+/).filter(Boolean);
  const oneEditApart = (left, right) => {
    if (Math.abs(left.length - right.length) > 1) return false;
    let leftIndex = 0;
    let rightIndex = 0;
    let edits = 0;
    while (leftIndex < left.length && rightIndex < right.length) {
      if (left[leftIndex] === right[rightIndex]) {
        leftIndex += 1;
        rightIndex += 1;
        continue;
      }
      edits += 1;
      if (edits > 1) return false;
      if (left.length > right.length) leftIndex += 1;
      else if (right.length > left.length) rightIndex += 1;
      else {
        leftIndex += 1;
        rightIndex += 1;
      }
    }
    return edits + (leftIndex < left.length || rightIndex < right.length ? 1 : 0) <= 1;
  };

  const highlightText = (root, needles) => {
    const terms = Array.from(new Set(needles.flatMap(tokenize))).filter((term) => term.length > 1);
    if (!root || !terms.length) return;
    const expression = new RegExp(`(${terms.sort((a, b) => b.length - a.length).map(escapeRegExp).join("|")})`, "gi");
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest("#searchResults, form, button, script, style, svg, mark")) {
          return NodeFilter.FILTER_REJECT;
        }
        expression.lastIndex = 0;
        return expression.test(node.nodeValue || "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const text = node.nodeValue || "";
      expression.lastIndex = 0;
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      for (const match of text.matchAll(expression)) {
        const start = match.index || 0;
        if (start > lastIndex) fragment.append(document.createTextNode(text.slice(lastIndex, start)));
        const mark = document.createElement("mark");
        mark.className = "search-highlight";
        mark.textContent = match[0];
        fragment.append(mark);
        lastIndex = start + match[0].length;
      }
      if (lastIndex < text.length) fragment.append(document.createTextNode(text.slice(lastIndex)));
      node.parentNode?.replaceChild(fragment, node);
    });
  };

  const getSearchItems = () => {
    const items = [];
    document.querySelectorAll("main section[id]").forEach((section) => {
      const sectionTitle = section.querySelector("h2")?.textContent.trim() || section.id;
      section.querySelectorAll("details").forEach((details) => {
        const summary = details.querySelector(":scope > summary");
        const title = summary?.querySelector("strong")?.textContent.trim() || summary?.textContent.trim() || sectionTitle;
        items.push({
          id: details.id,
          title,
          sectionTitle,
          body: details.textContent.replace(/\s+/g, " ").trim(),
          details,
        });
      });

      const clone = section.cloneNode(true);
      clone
        .querySelectorAll("details, .section-accordion-controls, form, .search-results")
        .forEach((node) => node.remove());
      const body = clone.textContent.replace(/\s+/g, " ").trim();
      if (body) items.push({ id: section.id, title: sectionTitle, sectionTitle, body, details: null });
    });
    return items;
  };

  const searchItems = getSearchItems().map((item) => {
    const searchable = normalize(`${item.title} ${item.sectionTitle} ${item.body}`);
    return {
      ...item,
      searchable,
      tokens: new Set(tokenize(searchable)),
    };
  });
  const searchVocabulary = new Set(searchItems.flatMap((item) => Array.from(item.tokens)));
  const autocompleteTerms = [
    ...searchItems.map((item) => ({ label: item.title, query: item.title })),
    ...Object.entries(searchAliases).flatMap(([alias, values]) =>
      values.map((value) => ({ label: `${alias.toUpperCase()} · ${value}`, query: value, alias })),
    ),
  ];

  const getTermVariants = (term) => {
    const normalized = normalize(term);
    const variants = [normalized, ...(searchAliases[normalized] || []).map(normalize)];
    if (normalized.length >= 5) {
      searchVocabulary.forEach((word) => {
        if (oneEditApart(normalized, word)) variants.push(word);
      });
    }
    return Array.from(new Set(variants.filter(Boolean)));
  };

  const getAutocompleteSuggestions = (query) => {
    if (query.length < 2) return [];
    const lastTerm = query.split(/\s+/).at(-1) || query;
    const candidates = autocompleteTerms.filter(({ label, query: candidateQuery, alias }) => {
      const normalizedLabel = normalize(label);
      const normalizedCandidate = normalize(candidateQuery);
      return (
        normalizedLabel.startsWith(query) ||
        normalizedCandidate.startsWith(query) ||
        Boolean(alias && normalize(alias).startsWith(lastTerm)) ||
        tokenize(candidateQuery).some((word) => word.startsWith(lastTerm))
      );
    });
    const unique = new Map();
    candidates.forEach((candidate) => {
      const key = normalize(candidate.query);
      if (!unique.has(key)) unique.set(key, candidate);
    });
    return Array.from(unique.values()).slice(0, 5);
  };

  const setSearchSuggestion = (query) => {
    if (!(globalSearch instanceof HTMLInputElement)) return;
    globalSearch.value = query;
    globalSearch.dispatchEvent(new Event("input", { bubbles: true }));
    globalSearch.focus();
  };

  let activeSearchSuggestion = -1;
  let searchResultsDismissed = false;
  let searchRenderTimer = 0;

  const showSearchLoading = () => {
    if (!searchResults || !globalSearch) return;
    const status = document.createElement("p");
    status.className = "search-loading";
    status.setAttribute("role", "status");
    status.textContent = "Searching the learning resource…";
    searchResults.replaceChildren(status);
    searchResults.classList.remove("has-results");
    searchResults.classList.add("is-loading");
    searchResults.hidden = false;
    globalSearch.setAttribute("aria-expanded", "true");
  };

  const renderGlobalSearch = () => {
    if (!(globalSearch instanceof HTMLInputElement) || !searchResults) return;
    window.clearTimeout(searchRenderTimer);
    searchResults.classList.remove("is-loading");
    clearHighlights();
    if (clearGlobalSearch) clearGlobalSearch.hidden = !globalSearch.value;
    const originalQuery = globalSearch.value.trim();
    const query = normalize(originalQuery);
    searchResults.replaceChildren();
    if (!query || searchResultsDismissed) {
      searchResults.hidden = true;
      searchResults.classList.remove("has-results");
      globalSearch.setAttribute("aria-expanded", "false");
      globalSearch.setAttribute("aria-controls", "searchResults");
      globalSearch.removeAttribute("aria-activedescendant");
      return;
    }

    const terms = query.split(/\s+/).filter(Boolean);
    activeSearchSuggestion = -1;
    globalSearch.removeAttribute("aria-activedescendant");
    const variantsByTerm = terms.map(getTermVariants);
    const matches = searchItems
      .map((item) => {
        let score = 0;
        let matched = true;
        terms.forEach((term, index) => {
          const variants = variantsByTerm[index];
          const exactMatch = variants.some((variant) =>
            variant.length <= 2 ? item.tokens.has(variant) : item.searchable.includes(variant),
          );
          const queryWords = tokenize(term);
          const fuzzyMatch =
            !exactMatch &&
            queryWords.every(
              (queryWord) =>
                queryWord.length >= 5 && Array.from(item.tokens).some((word) => oneEditApart(queryWord, word)),
            );
          if (!exactMatch && !fuzzyMatch) {
            matched = false;
            return;
          }
          if (item.title && variants.some((variant) => normalize(item.title).includes(variant))) score += 8;
          if (item.sectionTitle && variants.some((variant) => normalize(item.sectionTitle).includes(variant))) score += 4;
          score += exactMatch ? 2 : 1;
        });
        return matched ? { ...item, score } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    const suggestions = getAutocompleteSuggestions(query);
    if (suggestions.length) {
      const suggestionList = document.createElement("div");
      suggestionList.className = "search-autocomplete";
      suggestionList.id = "searchAutocomplete";
      suggestionList.setAttribute("role", "listbox");
      suggestionList.setAttribute("aria-label", "Search suggestions");
      suggestions.forEach((suggestion, index) => {
        const option = document.createElement("button");
        option.className = "search-autocomplete-option";
        option.id = `searchSuggestion-${index}`;
        option.type = "button";
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", "false");
        option.dataset.searchSuggestion = suggestion.query;
        option.textContent = suggestion.label;
        suggestionList.append(option);
      });
      searchResults.append(suggestionList);
      globalSearch.setAttribute("aria-controls", "searchAutocomplete searchResults");
    } else {
      globalSearch.setAttribute("aria-controls", "searchResults");
    }
    const heading = document.createElement("p");
    heading.className = "search-result-count";
    heading.setAttribute("role", "status");
    heading.textContent = matches.length
      ? `${matches.length} ${matches.length === 1 ? "result" : "results"} for “${originalQuery}”`
      : `No results for “${originalQuery}”.`;
    searchResults.append(heading);

    searchResults.classList.toggle("has-results", matches.length > 0);
    if (matches.length) {
      const list = document.createElement("ol");
      list.className = "search-result-list";
      matches.forEach((match) => {
        const result = document.createElement("li");
        const link = document.createElement("a");
        link.className = "search-result-card";
        link.href = `#${match.id}`;
        link.dataset.resultId = match.id;
        const section = document.createElement("span");
        section.className = "search-result-section";
        section.textContent = match.sectionTitle;
        const title = document.createElement("strong");
        title.className = "search-result-title";
        title.textContent = match.title;
        const excerpt = document.createElement("span");
        excerpt.className = "search-result-excerpt";
        const primaryNeedles = variantsByTerm[0];
        let matchIndex = primaryNeedles
          .map((needle) => normalize(match.body).indexOf(needle))
          .filter((index) => index >= 0)
          .sort((a, b) => a - b)[0] ?? -1;
        if (matchIndex < 0) {
          const matchWord = tokenize(match.body).find((word) => oneEditApart(terms[0], word));
          if (matchWord) matchIndex = normalize(match.body).indexOf(matchWord);
        }
        const excerptStart = Math.max(0, matchIndex - 70);
        const excerptText = `${excerptStart > 0 ? "…" : ""}${match.body.slice(excerptStart, excerptStart + 180)}${match.body.length > excerptStart + 180 ? "…" : ""}`;
        excerpt.append(document.createTextNode(excerptText));
        highlightText(excerpt, variantsByTerm.flat());
        link.append(section, title, excerpt);
        result.append(link);
        list.append(result);
      });
      searchResults.append(list);
    } else {
      const emptyState = document.createElement("p");
      emptyState.className = "search-no-results";
      emptyState.textContent = "Try a different symptom, medication, or diagnosis.";
      searchResults.append(emptyState);
    }
    searchResults.hidden = false;
    globalSearch.setAttribute("aria-expanded", "true");
  };

  if (searchForm && globalSearch) {
    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      window.clearTimeout(searchRenderTimer);
      renderGlobalSearch();
    });
    globalSearch.addEventListener("input", () => {
      searchResultsDismissed = false;
      window.clearTimeout(searchRenderTimer);
      if (!normalize(globalSearch.value)) {
        renderGlobalSearch();
        return;
      }
      showSearchLoading();
      searchRenderTimer = window.setTimeout(renderGlobalSearch, 90);
    });
    globalSearch.addEventListener("keydown", (event) => {
      const suggestions = Array.from(searchResults?.querySelectorAll(".search-autocomplete-option") || []);
      if (event.key === "ArrowDown" && suggestions.length) {
        event.preventDefault();
        activeSearchSuggestion = (activeSearchSuggestion + 1) % suggestions.length;
        suggestions.forEach((suggestion, index) => {
          suggestion.setAttribute("aria-selected", String(index === activeSearchSuggestion));
        });
        globalSearch.setAttribute("aria-activedescendant", suggestions[activeSearchSuggestion].id);
      } else if (event.key === "ArrowUp" && suggestions.length) {
        event.preventDefault();
        activeSearchSuggestion = activeSearchSuggestion <= 0 ? suggestions.length - 1 : activeSearchSuggestion - 1;
        suggestions.forEach((suggestion, index) => {
          suggestion.setAttribute("aria-selected", String(index === activeSearchSuggestion));
        });
        globalSearch.setAttribute("aria-activedescendant", suggestions[activeSearchSuggestion].id);
      } else if (event.key === "Enter" && activeSearchSuggestion >= 0 && suggestions[activeSearchSuggestion]) {
        event.preventDefault();
        setSearchSuggestion(suggestions[activeSearchSuggestion].dataset.searchSuggestion || "");
      } else if (event.key === "Escape" && !searchResults?.hidden) {
        event.preventDefault();
        window.clearTimeout(searchRenderTimer);
        searchResultsDismissed = true;
        renderGlobalSearch();
      } else if (event.key === "Escape" && globalSearch.value) {
        event.preventDefault();
        window.clearTimeout(searchRenderTimer);
        globalSearch.value = "";
        searchResultsDismissed = false;
        renderGlobalSearch();
      }
    });
  }

  clearGlobalSearch?.addEventListener("click", () => {
    if (!(globalSearch instanceof HTMLInputElement)) return;
    window.clearTimeout(searchRenderTimer);
    globalSearch.value = "";
    searchResultsDismissed = false;
    renderGlobalSearch();
    globalSearch.focus();
  });

  searchResults?.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const suggestion = event.target.closest(".search-autocomplete-option");
    if (suggestion instanceof HTMLButtonElement) {
      setSearchSuggestion(suggestion.dataset.searchSuggestion || "");
      return;
    }
  });

  searchResults?.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest(".search-result-card");
    const targetId = link?.getAttribute("href")?.slice(1);
    const target = targetId ? document.getElementById(decodeURIComponent(targetId)) : null;
    const details = target instanceof HTMLDetailsElement ? target : target?.closest("details");
    if (details) {
      details.open = true;
      details.querySelector(":scope > summary")?.setAttribute("aria-expanded", "true");
    }
    const matchedItem = searchItems.find((item) => item.id === targetId);
    if (matchedItem) {
      const needles = globalSearch?.value.trim().split(/\s+/).flatMap(getTermVariants) || [];
      highlightText(target, needles);
    }
  });

  document.querySelectorAll("[data-search-query]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!(globalSearch instanceof HTMLInputElement)) return;
      globalSearch.value = button.getAttribute("data-search-query") || "";
      globalSearch.dispatchEvent(new Event("input", { bubbles: true }));
      globalSearch.focus();
    });
  });

  // البحث والتصفية داخل بطاقات الأدوية
  const medicationSearch = document.getElementById("medicationSearch");
  const medicationCards = Array.from(document.querySelectorAll(".medication-card"));
  const medicationComparisonCards = Array.from(document.querySelectorAll(".medication-comparison-card"));
  const medicationEmpty = document.getElementById("medicationEmpty");
  const medicationCount = document.getElementById("medicationCount");
  const filterChips = Array.from(document.querySelectorAll(".filter-chip"));
  const resetMedicationFilters = document.getElementById("resetMedicationFilters");

  const updateMedicationResults = () => {
    const query = normalize(medicationSearch?.value || "");
    const activeFilters = new Map();
    filterChips.forEach((chip) => {
      if (chip.getAttribute("aria-pressed") !== "true") return;
      const group = chip.dataset.filterGroup || "";
      const values = activeFilters.get(group) || [];
      values.push(chip.dataset.filterValue || "");
      activeFilters.set(group, values);
    });

    let visible = 0;
    medicationCards.forEach((card) => {
      const searchable = normalize(`${card.textContent} ${card.dataset.search || ""}`);
      const matchesQuery = !query || searchable.includes(query);
      const matchesFilters = Array.from(activeFilters.entries()).every(([group, values]) => {
        const attribute = group === "class" ? "class" : group === "mechanism" ? "mechanism" : "effects";
        const cardValues = (card.dataset[attribute] || "").split(/\s+/);
        return values.some((value) => cardValues.includes(value));
      });
      const isVisible = matchesQuery && matchesFilters;
      card.hidden = !isVisible;
      if (isVisible) visible += 1;
    });
    let visibleComparisons = 0;
    medicationComparisonCards.forEach((card) => {
      const searchable = normalize(`${card.textContent} ${card.dataset.searchable || ""}`);
      const matchesQuery = !query || searchable.includes(query);
      const matchesFilters = Array.from(activeFilters.entries()).every(([group, values]) => {
        const attribute = group === "class" ? "class" : group === "mechanism" ? "mechanism" : "effects";
        const cardValues = (card.dataset[attribute] || "").split(/\s+/);
        return values.some((value) => cardValues.includes(value));
      });
      card.hidden = !(matchesQuery && matchesFilters);
      if (!card.hidden) visibleComparisons += 1;
    });

    if (medicationEmpty) medicationEmpty.hidden = visible > 0;
    const comparisonEmpty = document.querySelector(".medication-comparison-empty");
    if (comparisonEmpty) comparisonEmpty.hidden = visibleComparisons > 0;
    if (medicationCount) {
      medicationCount.textContent = `${visibleComparisons} of ${medicationComparisonCards.length} medication classes`;
    }
  };

  medicationSearch?.addEventListener("input", updateMedicationResults);
  filterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const isPressed = chip.getAttribute("aria-pressed") === "true";
      chip.setAttribute("aria-pressed", String(!isPressed));
      updateMedicationResults();
    });
  });
  resetMedicationFilters?.addEventListener("click", () => {
    if (medicationSearch instanceof HTMLInputElement) medicationSearch.value = "";
    filterChips.forEach((chip) => chip.setAttribute("aria-pressed", "false"));
    updateMedicationResults();
  });
  updateMedicationResults();

  // تحديث رابط الترويسة حسب القسم الظاهر
  const navigationLinks = Array.from(document.querySelectorAll(".primary-nav a[href^='#']"));
  const observedSections = navigationLinks
    .map((link) => document.getElementById(decodeURIComponent(link.hash.slice(1))))
    .filter((section) => section instanceof HTMLElement);

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (!visibleEntries.length) return;
        const current = visibleEntries.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0].target;
        navigationLinks.forEach((link) => {
          if (link.hash === `#${current.id}`) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.1, 0.25, 0.5] },
    );
    observedSections.forEach((section) => observer.observe(section));
  }
})();
