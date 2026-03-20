// app.js — Main application: tab navigation, portal rendering, sign-off

const App = {
    portalId: null,
    checklistData: null,
    architectureData: null,

    init(portalId) {
        this.portalId = portalId;

        if (portalId === 'power_stage') {
            this.checklistData = POWER_STAGE_CHECKLIST;
            this.architectureData = POWER_STAGE_ARCHITECTURE;
        } else {
            this.checklistData = SIGNAL_CHAIN_CHECKLIST;
            this.architectureData = SIGNAL_CHAIN_ARCHITECTURE;
        }

        document.getElementById('portal-title').textContent = this.checklistData.title;
        document.getElementById('portal-role').textContent = this.checklistData.role;

        this._renderArchitecture();
        this._renderChecklist();
        this._renderSignoff();
        this._bindTabs();
        this._bindExport();
    },

    _renderArchitecture() {
        const container = document.getElementById('tab-architecture');
        let html = '<div class="architecture-content">';
        this.architectureData.forEach(sec => {
            html += `
                <div class="arch-section" id="arch-${sec.id}">
                    <h3>${sec.title}</h3>
                    ${sec.html}
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    },

    _renderChecklist() {
        const container = document.getElementById('tab-checklist');
        Checklist.renderAll(this.portalId, this.checklistData, container);
    },

    _renderSignoff() {
        const state = Storage.load(this.portalId);
        const so = state.signoff || {};
        const container = document.getElementById('tab-signoff');

        container.innerHTML = `
            <div class="signoff-form">
                <h3>Reviewer Sign-Off</h3>
                <div class="signoff-field">
                    <label>Reviewer Name</label>
                    <input type="text" id="signoff-name" value="${so.reviewerName || ''}" placeholder="Your full name">
                </div>
                <div class="signoff-field">
                    <label>Date Reviewed</label>
                    <input type="date" id="signoff-date" value="${so.dateReviewed || new Date().toISOString().slice(0, 10)}">
                </div>
                <div class="signoff-field">
                    <label>Overall Assessment</label>
                    <select id="signoff-assessment">
                        <option value="" ${!so.overallAssessment ? 'selected' : ''}>— Select —</option>
                        <option value="PASS" ${so.overallAssessment === 'PASS' ? 'selected' : ''}>PASS</option>
                        <option value="PASS_WITH_COMMENTS" ${so.overallAssessment === 'PASS_WITH_COMMENTS' ? 'selected' : ''}>PASS with comments</option>
                        <option value="FAIL" ${so.overallAssessment === 'FAIL' ? 'selected' : ''}>FAIL</option>
                    </select>
                </div>
                <div class="signoff-field">
                    <label>Critical Items Found</label>
                    <textarea id="signoff-critical" rows="4" placeholder="List any critical issues...">${so.criticalItems || ''}</textarea>
                </div>
                <div class="signoff-field">
                    <label>Recommendations</label>
                    <textarea id="signoff-recommendations" rows="4" placeholder="Your recommendations...">${so.recommendations || ''}</textarea>
                </div>

                <div class="export-buttons">
                    <button id="btn-export-json" class="btn btn-primary">Export Review (JSON)</button>
                    <button id="btn-print" class="btn btn-secondary">Print to PDF</button>
                    <button id="btn-clear" class="btn btn-danger">Clear All Data</button>
                </div>
            </div>
        `;

        // Bind signoff field saves
        ['signoff-name', 'signoff-date', 'signoff-assessment'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('change', () => {
                const field = id.replace('signoff-', '');
                const map = { name: 'reviewerName', date: 'dateReviewed', assessment: 'overallAssessment' };
                Storage.saveSignoff(this.portalId, map[field], el.value);
            });
        });

        ['signoff-critical', 'signoff-recommendations'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', () => {
                const field = id === 'signoff-critical' ? 'criticalItems' : 'recommendations';
                Storage.saveSignoff(this.portalId, field, el.value);
            });
        });
    },

    _bindTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
            });
        });
    },

    _bindExport() {
        document.addEventListener('click', (e) => {
            if (e.target.id === 'btn-export-json') {
                Export.downloadJSON(this.portalId, this.checklistData);
            }
            if (e.target.id === 'btn-print') {
                Export.printToPDF();
            }
            if (e.target.id === 'btn-clear') {
                if (confirm('This will permanently delete all your review progress. Are you sure?')) {
                    Storage.clearAll(this.portalId);
                    location.reload();
                }
            }
        });
    }
};
