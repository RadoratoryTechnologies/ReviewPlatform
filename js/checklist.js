// checklist.js — Render checklist items with PASS/FAIL/NA + comments

const Checklist = {
    renderAll(portalId, checklistData, container) {
        let html = '';
        html += this._renderHeader(checklistData);
        checklistData.sections.forEach(sec => {
            html += this._renderSection(portalId, sec);
        });
        container.innerHTML = html;
        this._bindEvents(portalId, checklistData);
        this.updateProgress(portalId, checklistData);
    },

    _renderHeader(data) {
        return `
            <div class="checklist-header">
                <p class="checklist-instructions">${data.instructions}</p>
                <div class="specs-box">
                    <h4>Key Specifications</h4>
                    <ul>${data.specs.map(s => `<li>${s}</li>`).join('')}</ul>
                </div>
                <div class="sheets-box">
                    <h4>Schematic Sheets in Scope</h4>
                    <table class="sheets-table">
                        <tr><th>Sheet</th><th>Content</th></tr>
                        ${data.sheets.map(s => `<tr><td><code>${s.name}</code></td><td>${s.content}</td></tr>`).join('')}
                    </table>
                </div>
            </div>
        `;
    },

    _renderSection(portalId, sec) {
        let itemsHtml = '';

        if (sec.subsections && sec.subsections.length > 0) {
            sec.subsections.forEach(sub => {
                itemsHtml += `<h4 class="subsection-title">${sub.title}</h4>`;
                sub.items.forEach(item => {
                    itemsHtml += this._renderItem(portalId, item);
                });
            });
        }

        if (sec.items && sec.items.length > 0) {
            sec.items.forEach(item => {
                itemsHtml += this._renderItem(portalId, item);
            });
        }

        const sheet = sec.sheet ? `<span class="section-sheet">${sec.sheet}</span>` : '';

        return `
            <details class="section-accordion" open>
                <summary class="section-header">
                    <span class="section-title">${sec.title}</span>
                    ${sheet}
                </summary>
                <div class="section-body">${itemsHtml}</div>
            </details>
        `;
    },

    _renderItem(portalId, item) {
        const saved = Storage.getItemState(portalId, item.id);
        const statusClass = saved.status ? saved.status.toLowerCase().replace('/', '') : '';

        return `
            <div class="checklist-item ${statusClass}" data-item-id="${item.id}">
                <div class="item-main">
                    <span class="item-id">${item.id}</span>
                    <div class="item-content">
                        <div class="item-check">${item.check}</div>
                        <div class="item-criterion">${item.criterion}</div>
                        ${item.note ? `<div class="item-note">${item.note}</div>` : ''}
                    </div>
                    <div class="item-radios">
                        <label class="radio-pass">
                            <input type="radio" name="status-${item.id}" value="PASS" ${saved.status === 'PASS' ? 'checked' : ''}>
                            <span>PASS</span>
                        </label>
                        <label class="radio-fail">
                            <input type="radio" name="status-${item.id}" value="FAIL" ${saved.status === 'FAIL' ? 'checked' : ''}>
                            <span>FAIL</span>
                        </label>
                        <label class="radio-na">
                            <input type="radio" name="status-${item.id}" value="N/A" ${saved.status === 'N/A' ? 'checked' : ''}>
                            <span>N/A</span>
                        </label>
                    </div>
                </div>
                <textarea class="item-comment" placeholder="Comments..." data-item-id="${item.id}">${saved.comment || ''}</textarea>
                <div class="item-status-print">${saved.status || '—'}</div>
            </div>
        `;
    },

    _bindEvents(portalId, checklistData) {
        // Radio buttons
        document.querySelectorAll('.item-radios input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const itemId = e.target.name.replace('status-', '');
                Storage.saveItemStatus(portalId, itemId, e.target.value);
                const itemEl = e.target.closest('.checklist-item');
                itemEl.className = 'checklist-item ' + e.target.value.toLowerCase().replace('/', '');
                this.updateProgress(portalId, checklistData);
            });
        });

        // Comment textareas
        document.querySelectorAll('.item-comment').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const itemId = e.target.dataset.itemId;
                Storage.saveItemComment(portalId, itemId, e.target.value);
            });
        });
    },

    updateProgress(portalId, checklistData) {
        const allItems = Export._flattenItems(checklistData);
        const prog = Storage.countProgress(portalId, allItems.length);
        const el = document.getElementById('progress-count');
        if (el) el.textContent = `${prog.answered} / ${prog.total}`;
        const bar = document.getElementById('progress-bar');
        if (bar) bar.style.width = `${(prog.answered / prog.total * 100).toFixed(1)}%`;
    }
};
