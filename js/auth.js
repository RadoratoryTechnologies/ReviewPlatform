// auth.js — SHA-256 password gate with dual-portal routing

const Auth = {
    // SHA-256 hashes — generate with: echo -n "password" | sha256sum
    // Default passwords: PowerReview2026! and SignalReview2026!
    PORTALS: {
        power_stage: {
            hash: '165b5b1741c430054e20a682adad6711bb408e4a185509c37d8efdb0a8c9a512',
            label: 'Power Stage Review'
        },
        signal_chain: {
            hash: 'd9150c572a3f12a4b849e0b8ec16c9382c0c6c275ed27a4e5e1d413277e6850b',
            label: 'Signal Chain Review'
        }
    },

    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    async authenticate(password) {
        const hash = await this.hashPassword(password);
        for (const [portalId, config] of Object.entries(this.PORTALS)) {
            if (hash === config.hash) {
                sessionStorage.setItem('review_portal', portalId);
                return { success: true, portalId, label: config.label };
            }
        }
        return { success: false };
    },

    getSession() {
        const portalId = sessionStorage.getItem('review_portal');
        if (portalId && this.PORTALS[portalId]) {
            return { portalId, label: this.PORTALS[portalId].label };
        }
        return null;
    },

    logout() {
        sessionStorage.removeItem('review_portal');
    },

    async generateHash(password) {
        // Utility: call from browser console to generate hashes
        const hash = await this.hashPassword(password);
        console.log(`Password: "${password}"\nSHA-256:  ${hash}`);
        return hash;
    }
};
