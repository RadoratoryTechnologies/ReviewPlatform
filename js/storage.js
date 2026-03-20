// storage.js — localStorage read/write for review state

const Storage = {
    _debounceTimers: {},

    load(portalId) {
        try {
            const raw = localStorage.getItem(`review_${portalId}`);
            if (raw) return JSON.parse(raw);
        } catch (e) { console.warn('Storage load error:', e); }
        return { portalId, lastModified: null, items: {}, signoff: {} };
    },

    _save(portalId, state) {
        state.lastModified = new Date().toISOString();
        try {
            localStorage.setItem(`review_${portalId}`, JSON.stringify(state));
        } catch (e) { console.warn('Storage save error:', e); }
    },

    saveItemStatus(portalId, itemId, status) {
        const state = this.load(portalId);
        if (!state.items[itemId]) state.items[itemId] = {};
        state.items[itemId].status = status;
        this._save(portalId, state);
    },

    saveItemComment(portalId, itemId, comment) {
        clearTimeout(this._debounceTimers[itemId]);
        this._debounceTimers[itemId] = setTimeout(() => {
            const state = this.load(portalId);
            if (!state.items[itemId]) state.items[itemId] = {};
            state.items[itemId].comment = comment;
            this._save(portalId, state);
        }, 500);
    },

    saveSignoff(portalId, field, value) {
        const state = this.load(portalId);
        state.signoff[field] = value;
        this._save(portalId, state);
    },

    getItemState(portalId, itemId) {
        const state = this.load(portalId);
        return state.items[itemId] || { status: null, comment: '' };
    },

    clearAll(portalId) {
        localStorage.removeItem(`review_${portalId}`);
    },

    countProgress(portalId, totalItems) {
        const state = this.load(portalId);
        let answered = 0;
        for (const key in state.items) {
            if (state.items[key].status) answered++;
        }
        return { answered, total: totalItems };
    }
};
