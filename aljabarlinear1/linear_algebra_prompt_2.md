**Objective:**  
Create an engaging, interactive slide deck for an undergraduate *Linear Algebra* course in Electrical and Computer Engineering (ECE), blending theoretical concepts with practical, hands-on demonstrations using Quarto and reveal.js.

**Task:**  
Develop an interactive Quarto-based presentation using reveal.js tailored for undergraduate ECE students. Adhere to the slide structure, content guidelines, formatting rules, and course-specific requirements outlined below.

## 1. Slide Structure  
- **Slide Separator:** Use `---` to separate slides.  
- **Title Slide:** Use a first-level heading (`#`) and/or second-level heading (`##`).  
- **Standard Slides:** Begin with a second-level heading (`##`) followed by content.

## 2. Content Guidelines  
- Write text in markdown format, ending each sentence with double spaces.  
- Enhance slides with:  
  - Diagrams (using Mermaid.js or Graphviz).  
  - Executable Python code blocks (using Pyodide).  
  - Interactive visualizations (using Python, Pyodide, Observable.js, and Plotly).  
  - Math formulas (using LaTeX).  
  - Multi-column layouts.  
  - Speaker notes for additional context.
  - Callout for drawing extra attention.

## 3. Diagrams  
- Create diagrams using Mermaid.js or Graphviz
- Format for Mermaid.js:  

```
\`\`\`\{mermaid\}
Mermaid code here
\`\`\`\
```

- Format for Graphviz:  

```
\`\`\`\{dot\}
Graphviz code here
\`\`\`\
```

## 4. Executable Code Blocks  
- Include executable Python code blocks using Pyodide, formatted as:  

```
\`\`\`\{pyodide\}
#| max-lines: 10
Python code here
\`\`\`\
```

## 5. Interactive Code Blocks  
- Create interactive visualizations using Python, Pyodide, Observable.js, and Plotly, formatted as:  

```
\`\`\`\{ojs\}
Observable.js code here
```
\`\`\`\{pyodide\}
#| echo: false
#| input:
Python code here
\`\`\`\
```

## 6. Math Formulas  
- Use LaTeX for mathematical expressions:  
  - **Inline:** 
    ```
    $E=mc^2$
    ```
  - **Block:**  
    ```
    $$ E=mc^2 $$
    ```

## 7. Multi-Column Layout  
- Use multi-column layouts for balanced content presentation, formatted as:  

  ```
  :::: {.columns}
  ::: {.column width="50%"}
  **Left Column**  
  - Item L1  
  - Item L2  
  :::
  ::: {.column width="50%"}
  **Right Column**  
  - Item R1  
  - Item R2  
  - Item R3  
  :::
  ::::
  ```

## 8. Speaker Notes  
- Include speaker notes for additional explanations, formatted as:  

  ```
  **Slide Content:**  
  - Point 1  
  - Point 2  

  ::: {.notes}
  Speaker notes here.
  :::
  ```

## 9. Callout

- There are five different types of callouts available: `callout-note`, `callout-warning`, `callout-important`, `callout-tip`, and `callout-caution`.
- Include callout for extra attention, formatted as:  

```
**Slide Content:**  
- Point 1  
- Point 2  

::: {.callout-note}
Callout notes here.
:::
```

## 10. Course-Specific Requirements  
1. **Content Source:** Use provided text and linked images as primary resources.  
2. **Academic Context:** Ensure explanations, examples, and terminology align with ECE standards for *Linear Algebra*.  
3. **Interactivity:**  
   - Incorporate Python-based interactive elements (e.g., plots, vector and matrix operations, transformations).  
   - Embed charts, plots, and simulations directly within slides.  
4. **Enhancement:** Include real-world engineering applications, analogies, and problem-solving examples to contextualize concepts.  
5. **Clarity & Engagement:** Maintain a logical structure with engaging visuals and concise slide text.  
6. **Conciseness:** Limit text on slides; elaborate in speaker notes. Split dense slides into multiple slides for clarity.

## 11. Presentation YAML  
Use the following YAML header, replacing `{Lecture Title}` with the specific lecture subtitle:  
```yaml
---
title: "Linear Algebra"
subtitle: "{Lecture Title}"
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
    mermaid:
        theme: neutral
pyodide:
  packages:
    - numpy
    - plotly
    - nbformat
---
```