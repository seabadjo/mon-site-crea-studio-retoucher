"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateEstimate = calculateEstimate;
exports.buildDevisPayload = buildDevisPayload;
exports.resolveApiBase = resolveApiBase;
exports.submitDevisToBackend = submitDevisToBackend;
function calculateEstimate(services, livrables, urgentMult = 1, flexibleDisc = 1) {
    let base = services.reduce((sum, service) => sum + service.price, 0);
    if (livrables.includes('Fichiers sources (Ai, Psd, Figma…)')) {
        base += base * 0.15;
    }
    if (livrables.includes('Guide de marque (Charte graphique)')) {
        base += 50000;
    }
    if (livrables.includes('Formation & présentation')) {
        base += 30000;
    }
    const finalPrice = Math.round(base * urgentMult * flexibleDisc);
    return { basePrice: base, finalPrice };
}
function buildDevisPayload(formState) {
    const services = Array.isArray(formState.selectedServices)
        ? formState.selectedServices
        : [];
    const livrables = Array.isArray(formState.selectedLivrables)
        ? formState.selectedLivrables
        : [];
    const { basePrice, finalPrice } = calculateEstimate(services, livrables, Number(formState.urgentMult || 1), Number(formState.flexibleDisc || 1));
    return {
        first_name: String(formState.firstName || ''),
        last_name: String(formState.lastName || ''),
        email: String(formState.email || ''),
        phone: String(formState.phone || ''),
        company: String(formState.company || ''),
        sector: String(formState.sector || ''),
        team_size: String(formState.teamSize || ''),
        services,
        budget: Number(formState.budget || 0),
        delai: String(formState.selectedDelai || ''),
        livrables,
        project_name: String(formState.projectName || ''),
        project_desc: String(formState.projectDesc || ''),
        references: String(formState.references || ''),
        has_identity: String(formState.hasIdentity || ''),
        extra: String(formState.extra || ''),
        base_price: basePrice,
        final_price: finalPrice,
    };
}
function resolveApiBase(windowRef = window) {
    const configuredBase = windowRef.CreaStudioApiBase;
    if (configuredBase)
        return configuredBase;
    return windowRef.location.port === '8080' ? 'http://localhost:3000' : '';
}
async function submitDevisToBackend(payload, windowRef = window) {
    const response = await fetch(`${resolveApiBase(windowRef)}/api/devis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || 'Impossible d’envoyer le devis.');
    }
    return data;
}
if (typeof window !== 'undefined') {
    window.CreaStudioDevis = {
        calculateEstimate,
        buildDevisPayload,
        submitDevisToBackend,
        resolveApiBase,
    };
}
