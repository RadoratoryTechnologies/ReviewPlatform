// export.js — JSON export and print-to-PDF

const Export = {
    generateJSON(portalId, checklistData) {
        const state = Storage.load(portalId);
        const allItems = this._flattenItems(checklistData);
        const totalItems = allItems.length;

        let pass = 0, fail = 0, na = 0, unanswered = 0;
        const failedItems = [];

        allItems.forEach(item => {
            const s = state.items[item.id];
            if (!s || !s.status) { unanswered++; return; }
            if (s.status === 'PASS') pass++;
            else if (s.status === 'FAIL') {
                fail++;
                failedItems.push({
                    id: item.id,
                    check: item.check,
                    criterion: item.criterion,
                    comment: s.comment || ''
                });
            }
            else if (s.status === 'N/A') na++;
        });

        const exportObj = {
            exportVersion: '1.0',
            portalId: portalId,
            project: checklistData.project,
            reviewRole: checklistData.role,
            exportedAt: new Date().toISOString(),
            signoff: state.signoff || {},
            summary: { totalItems, pass, fail, na, unanswered },
            failedItems: failedItems,
            allItems: {}
        };

        allItems.forEach(item => {
            const s = state.items[item.id] || {};
            exportObj.allItems[item.id] = {
                check: item.check,
                status: s.status || null,
                comment: s.comment || ''
            };
        });

        return exportObj;
    },

    downloadJSON(portalId, checklistData) {
        const data = this.generateJSON(portalId, checklistData);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${portalId}_review_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    printToPDF() {
        window.print();
    },

    _flattenItems(checklistData) {
        const items = [];
        checklistData.sections.forEach(sec => {
            if (sec.subsections) {
                sec.subsections.forEach(sub => {
                    sub.items.forEach(item => items.push(item));
                });
            }
            if (sec.items) {
                sec.items.forEach(item => items.push(item));
            }
        });
        return items;
    }
};
