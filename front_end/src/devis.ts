export interface ServiceOption {
  name: string;
  price: number;
}

export interface DevisPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  sector: string;
  team_size: string;
  services: ServiceOption[];
  budget: number;
  delai: string;
  livrables: string[];
  project_name: string;
  project_desc: string;
  references: string;
  has_identity: string;
  extra: string;
  base_price: number;
  final_price: number;
}

export function calculateEstimate(
  services: ServiceOption[],
  livrables: string[],
  urgentMult = 1,
  flexibleDisc = 1
): { basePrice: number; finalPrice: number } {
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

export function buildDevisPayload(formState: Record<string, unknown>): DevisPayload {
  const services = Array.isArray(formState.selectedServices)
    ? (formState.selectedServices as ServiceOption[])
    : [];
  const livrables = Array.isArray(formState.selectedLivrables)
    ? (formState.selectedLivrables as string[])
    : [];
  const { basePrice, finalPrice } = calculateEstimate(
    services,
    livrables,
    Number(formState.urgentMult || 1),
    Number(formState.flexibleDisc || 1)
  );

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

function getApiBase(): string {
  const configuredBase = (window as Window & { CreaStudioApiBase?: string }).CreaStudioApiBase;
  if (configuredBase) return configuredBase;
  return window.location.port === '8080' ? 'http://localhost:3000' : '';
}

export async function submitDevisToBackend(payload: DevisPayload) {
  const response = await fetch(`${getApiBase()}/api/devis`, {
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
