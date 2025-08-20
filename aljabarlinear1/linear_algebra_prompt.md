**Task:**
Create an interactive Quarto-based presentation using reveal.js for an undergraduate *Linear Algebra* course in the Electrical and Computer Engineering (ECE) program. Follow the slide structure, formatting rules, and course-specific requirements below.

---

## 1. Slide Structure

* Slide Separator: `---`
* Title Slide: Begin with a first-level heading (`#`) and/or second-level heading (`##`).
* Standard Slides: Start with a second-level heading (`##`) followed by content.

---

## 2. Content & Formatting

* Diagrams: use Mermaid.js as following  

```
\`\`\`\{mermaid\}
mermaid code here
… 
\`\`\`\
```

* Code Blocks: use Python and Pyodide as following  

```
\`\`\`\{pyodide\}
#| max-lines: 10
python code here
… 
\`\`\`\
```

* Math (LaTeX):

  * Inline: `$E=mc^2$`
  * Block:

    ```latex
    $$
    E=mc^2
    $$
    ```
* HTML Entities: Use `&entity_name;` (e.g., `&ne;` for ≠).
* Web Content: Embed via `<iframe>`.

---

## 3. Multi-Column Layout

```markdown
:::: {.columns}
::: {.column width="40%"}
**Left Column**  
- Item L1  
- Item L2  
:::
::: {.column width="60%"}
**Right Column**  
- Item R1  
- Item R2  
- Item R3  
:::
::::
```

---

## 4. Speaker Notes

```markdown
Slide content  

- Point 1  
- Point 2  

::: {.notes}
Speaker notes here.
:::
```

---

## 5. Course-Specific Requirements

1. Content Source: Use provided text and linked images.
2. Academic Context: Ensure explanations, examples, and terminology match Electrical and Computer Engineering standards.
3. Interactivity:

   * Include Python-based interactive elements (e.g., plots, vector and matrix operations, transformations).
   * Embed charts, plots, and simulations directly in slides.
4. Enhancement: Add real-world engineering applications, analogies, and problem-solving examples.
5. Clarity & Engagement: Maintain a clear, logical structure and engaging visuals.
6. Conciseness: Keep slide text concise; expand explanations in speaker notes.

---

## 6. Presentation YAML

Use this YAML as the document header. Replace `{Lecture Title}` with the specific lecture subtitle.

```yaml
---
title: "Linear Algebra"
subtitle: "{Lecture Title}"
author: "Imron Rosyadi"
author: "Imron Rosyadi"
format:
  live-revealjs:
    logo: "qrjs_assets/unsoed_logo.png"
    footer: "[irosyadi-2025](https://imron-slide.vercel.app)"
    slide-number: true
    chalkboard: true
    scrollable: true
    controls: true
    progress: true
    preview-links: false
    transition: fade
    incremental: false
    smaller: false
    theme: [default, qrjs_assets/ir_style.scss]
filters:
  - pyodide
---
```

---

**Goal:**
Deliver an interactive, educational slide deck that combines theoretical depth with practical demonstrations, making *Linear Algebra* concepts clear, engaging, and relevant to undergraduate ECE students.