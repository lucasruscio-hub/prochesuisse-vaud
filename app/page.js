"use client";
import React, { useRef, useState } from "react";
import {
  ClipboardList,
  MessageCircle,
  Search,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  ChevronDown,
  Clock3,
  TriangleAlert,
} from "lucide-react";
import Footer from "./components/Footer";
import Header from "./components/Header";
import {
  CARE_TYPE_OPTIONS,
  CONTACT_METHOD_OPTIONS,
  EMPTY_PUBLIC_INTAKE,
  NEED_OPTIONS,
  RELATIONSHIP_OPTIONS,
  TIMING_OPTIONS,
  buildPublicIntakePayload,
  validatePublicIntakeStep,
} from "@/lib/public-intake-form.mjs";
const Icon = ({ children, className = "" }) => (
  <span className={`inline-flex items-center justify-center ${className}`} aria-hidden="true">
    {children}
  </span>
);

const ArrowRight = ({ className = "" }) => <Icon className={className}>→</Icon>;
const Shield = ({ className = "" }) => <Icon className={className}>✓</Icon>;
const Pin = ({ className = "" }) => <Icon className={className}>⌖</Icon>;
const Lock = ({ className = "" }) => <Icon className={className}>🔒</Icon>;
const Phone = ({ className = "" }) => <Icon className={className}>☎</Icon>;
const Mail = ({ className = "" }) => <Icon className={className}>✉</Icon>;

const serviceCards = [
  {
    title: "Comprendre le Spitex privé",
    eyebrow: "Soins à domicile",
    text: "Distinguer les prestations privées, les soins pris en charge, la disponibilité et les tarifs.",
    symbol: "⇄",
    href: "#form",
    color: "bg-[#EEF7F3] text-[#27634E]",
  },
  {
    title: "Trouver un court séjour ou du répit",
    eyebrow: "Solution temporaire",
    text: "Après une hospitalisation, une chute ou lorsque les proches ont temporairement besoin de soutien.",
    symbol: "♡",
    href: "#form",
    color: "bg-[#FFF0EF] text-[#E64B60]",
  },
  {
    title: "Alzheimer et démence",
    eyebrow: "Accompagnement spécialisé",
    text: "Identifier les solutions adaptées lorsque la mémoire, la sécurité ou l’autonomie deviennent difficiles.",
    symbol: "◌",
    href: "#form",
    color: "bg-[#F2EEFF] text-[#5C4B8A]",
  },
];



const steps = [
  {
    n: "1",
    title: "Vous remplissez le formulaire",
    text: "Quelques questions simples nous permettent de comprendre la situation de votre proche.",
    Icon: ClipboardList,
  },
  {
    n: "2",
    title: "Nous comprenons vos besoins",
    text: "Nous analysons votre demande avec attention, sans jugement et sans engagement.",
    Icon: MessageCircle,
  },
  {
    n: "3",
    title: "Nous identifions les options adaptées",
    text: "Nous recherchons les solutions les plus pertinentes dans le canton de Vaud.",
    Icon: Search,
  },
  {
    n: "4",
    title: "Vous avancez sereinement",
    text: "Vous recevez une orientation claire et restez libre de choisir la prochaine étape.",
    Icon: HeartHandshake,
  },
];

const guideCards = [
  {
    title: "Financer les soins",
    text: "Comprendre LAMal, prestations complémentaires, aides cantonales et reste à charge.",
    symbol: "₣",
  },
  {
    title: "EMS ou aide à domicile ?",
    text: "Les critères pour choisir entre maintien à domicile, court séjour ou EMS.",
    symbol: "⇄",
  },
  {
    title: "Après une hospitalisation",
    text: "Les options possibles lorsqu’un proche ne peut pas rentrer seul à domicile.",
    symbol: "+",
  },
  {
    title: "Alzheimer et démence",
    text: "Les solutions à explorer lorsque la sécurité ou l’autonomie devient difficile.",
    symbol: "◎",
  },
  {
    title: "Court séjour / répit",
    text: "Une solution temporaire pour récupérer, soulager les proches ou attendre une place.",
    symbol: "◷",
  },
];

const providerExamples = [
  {
    type: "ems",
    category: "EMS",
    location: "Lausanne",
    name: "EMS Rozavère",
    area: "Lausanne · 1010",
    icon: "🏥",
    tone: "bg-[#EEF4FF]",
  },
  {
    type: "domicile",
    category: "Aide à domicile",
    location: "Renens",
    name: "Senevita Casa Vaud",
    area: "Renens · 1020",
    icon: "🏠",
    tone: "bg-[#FFF0EF]",
  },
  {
    type: "residence",
    category: "Résidence senior",
    location: "Montreux",
    name: "Nova Via Residenzen Montreux",
    area: "Montreux · 1820",
    icon: "🌿",
    tone: "bg-[#FFF4D8]",
  },
];

const faqs = [
  {
    q: "Lia est-il gratuit pour les familles ?",
    a: "Oui, la première orientation est gratuite. L’objectif est de vous aider à clarifier les options possibles avant de contacter les prestataires adaptés.",
  },
  {
    q: "Êtes-vous un prestataire médical ?",
    a: "Non. Lia n’est pas un prestataire médical et ne remplace pas l’avis d’un médecin, d’un CMS, d’un service social ou d’un professionnel de santé.",
  },
  {
    q: "Pouvez-vous garantir une place en EMS ?",
    a: "Non. Les admissions et disponibilités dépendent des établissements et des services compétents. Nous aidons à identifier les pistes pertinentes et les bons interlocuteurs.",
  },
  {
    q: "Pouvez-vous aider à comprendre le financement ?",
    a: "Oui, nous pouvons vous aider à comprendre les grandes catégories : assurance maladie, prestations complémentaires, aides cantonales et reste à charge. Nous ne remplaçons pas un conseil officiel ou juridique.",
  },
  {
    q: "Comment choisissez-vous les prestataires ?",
    a: "Nous regardons la localisation, le type de besoin, l’urgence, les services proposés et les informations disponibles. À terme, notre objectif est de vérifier davantage les disponibilités et spécialités.",
  },
  {
    q: "Que faire en cas d’urgence médicale ?",
    a: "En cas d’urgence médicale ou de danger immédiat, contactez le 144 ou un professionnel de santé. Lia n’est pas un service d’urgence.",
  },
];

function HeroImage() {
  return (
    <div className="relative min-h-[620px] overflow-hidden">
      <img
  src="/hero-lia.png"
  alt="Une femme accompagnant un proche âgé dans un cadre chaleureux"
  className="h-full min-h-[620px] w-full object-cover object-center"
/>

      <div className="absolute inset-0 bg-gradient-to-r from-[#FFF8F3] via-[#FFF8F3]/35 to-transparent" />
<div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#FFF8F3] to-transparent" />

      <div className="absolute bottom-10 left-10 max-w-sm rounded-[2rem] bg-white/90 p-6 shadow-2xl shadow-slate-300/30 backdrop-blur">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFE1DE] text-2xl text-[#FF5F72]">
            ♡
          </div>

          <p className="text-sm leading-7 text-[#10213D]">
            Chaque situation est unique. Nous sommes là pour vous écouter et vous guider, sans engagement.
          </p>
        </div>
      </div>
    </div>
  );
}

function HeroForm() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const idempotencyKeyRef = useRef(null);
  const [formData, setFormData] = useState(() => ({
    ...EMPTY_PUBLIC_INTAKE,
    needCodes: [],
  }));

  const totalSteps = 8;

  const updateField = (field, value) => {
    idempotencyKeyRef.current = null;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleNeedCode = (value) => {
    idempotencyKeyRef.current = null;
    setFormData((prev) => {
      const exists = prev.needCodes.includes(value);
      return {
        ...prev,
        needCodes: exists
          ? prev.needCodes.filter((item) => item !== value)
          : [...prev.needCodes, value],
      };
    });
  };

  const getStepError = () => {
    return validatePublicIntakeStep(step, formData);
};

const next = () => {
  const error = getStepError();

  if (error) {
    setSubmitError(error);
    return;
  }

  setSubmitError("");
  setStep((current) => Math.min(current + 1, totalSteps - 1));
};
  const back = () => {
  setSubmitError("");
  setStep((current) => Math.max(current - 1, 0));
};

const [isSubmitting, setIsSubmitting] = useState(false);
const [submitError, setSubmitError] = useState("");

const handleSubmit = async (event) => {
  event.preventDefault();
  if (isSubmitting) return;
  const validationError = validatePublicIntakeStep(totalSteps - 1, formData);
  if (validationError) {
    setSubmitError(validationError);
    return;
  }
  setIsSubmitting(true);
  setSubmitError("");

  try {
    const idempotencyKey = idempotencyKeyRef.current ?? crypto.randomUUID();
    idempotencyKeyRef.current = idempotencyKey;
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        ...buildPublicIntakePayload(formData),
      }),
    });

    if (!response.ok) {
      if (response.status === 409) idempotencyKeyRef.current = null;
      if (response.status === 413) throw new Error("Votre demande contient trop de texte.");
      if (response.status >= 500) throw new Error("Lia n’a pas pu enregistrer votre demande. Veuillez réessayer.");
      throw new Error("Certaines informations sont invalides. Vérifiez le formulaire puis réessayez.");
    }

    idempotencyKeyRef.current = null;
    setSubmitted(true);
  } catch (error) {
    setSubmitError(error instanceof Error
      ? error.message
      : "Une erreur est survenue. Veuillez réessayer ou nous contacter directement.");
  } finally {
    setIsSubmitting(false);
  }
};

  const progress = ((step + 1) / totalSteps) * 100;

  if (submitted) {
    return (
      <div className="rounded-[2rem] bg-white p-7 shadow-xl shadow-slate-200/60 ring-1 ring-slate-100">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF0EF] text-2xl text-[#E64B60]">✓</div>
        <h3 className="text-2xl font-semibold text-slate-950">Demande reçue</h3>
        <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
  <p>
    Merci, votre demande a bien été reçue.
  </p>

  <p>
    Nous allons analyser les informations transmises afin de comprendre
    votre demande et préparer une première sélection de solutions
    pertinentes.
  </p>

  <p>
    Les disponibilités, tarifs et conditions devront ensuite être confirmés
    auprès des prestataires concernés.
  </p>
</div>
        <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-xs leading-5 text-amber-800">
          En cas d’urgence médicale ou de danger immédiat, contactez le 144 ou un professionnel de santé.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[2rem] bg-white p-7 shadow-xl shadow-slate-200/60 ring-1 ring-slate-100">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="max-w-xs text-xl font-semibold leading-7 text-slate-950 sm:text-2xl">
            Préparons votre sélection personnalisée
          </h3>
          <span className="rounded-full bg-[#FFF0EF] px-3 py-1 text-xs font-semibold text-[#E64B60]">
            {step + 1}/{totalSteps}
          </span>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#FF5F72] transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {step === 0 && (
        <div>
          <label className="block text-base font-semibold text-slate-950">Quelle solution recherchez-vous ?</label>
          <p className="mt-2 text-xs leading-5 text-slate-500">Choisissez l’option la plus proche. Vous pourrez préciser ensuite.</p>
          <div className="mt-4 space-y-3">
            {CARE_TYPE_OPTIONS.map((option) => (
              <button key={option.value} type="button" onClick={() => updateField("careType", option.value)} aria-pressed={formData.careType === option.value} className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${formData.careType === option.value ? "border-[#FF5F72] bg-[#FFF0EF] text-[#10213D]" : "border-slate-200 bg-white text-slate-700 hover:border-rose-200"}`}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <label className="block text-base font-semibold text-slate-950">Pour qui faites-vous cette demande ?</label>
          <div className="mt-4 space-y-3">
            {RELATIONSHIP_OPTIONS.map((option) => (
              <button key={option.value} type="button" onClick={() => updateField("beneficiaryRelationship", option.value)} aria-pressed={formData.beneficiaryRelationship === option.value} className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${formData.beneficiaryRelationship === option.value ? "border-[#FF5F72] bg-[#FFF0EF] text-[#10213D]" : "border-slate-200 bg-white text-slate-700 hover:border-rose-200"}`}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <label className="block text-base font-semibold text-slate-950">Dans quel délai cherchez-vous une solution ?</label>
          <div className="mt-4 space-y-3">
            {TIMING_OPTIONS.map((option) => (
              <button key={option.value} type="button" onClick={() => updateField("timing", option.value)} aria-pressed={formData.timing === option.value} className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${formData.timing === option.value ? "border-[#FF5F72] bg-[#FFF0EF] text-[#10213D]" : "border-slate-200 bg-white text-slate-700 hover:border-rose-200"}`}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <label htmlFor="intake-location" className="block text-base font-semibold text-slate-950">Où la solution est-elle recherchée ?</label>
          <p className="mt-2 text-xs leading-5 text-slate-500">Une commune, une région ou un code postal suffit. N’indiquez pas d’adresse privée.</p>
          <input id="intake-location" value={formData.location} onChange={(e) => updateField("location", e.target.value)} placeholder="Ex. Lausanne, 1000, Nyon ou Riviera" maxLength={160} autoComplete="postal-code" className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-[#FF5F72] focus:ring-4 focus:ring-[#FFD8D4]" />
        </div>
      )}

      {step === 4 && (
        <div>
          <label className="block text-base font-semibold text-slate-950">Quels types de soutien seraient utiles ?</label>
          <p className="mt-2 text-xs leading-5 text-slate-500">Facultatif. Sélectionnez seulement les grandes catégories utiles.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {NEED_OPTIONS.map((option) => (
              <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs leading-5 transition ${formData.needCodes.includes(option.value) ? "border-[#FF5F72] bg-[#FFF0EF] text-[#10213D]" : "border-slate-200 bg-white text-slate-700"}`}>
                <input type="checkbox" checked={formData.needCodes.includes(option.value)} onChange={() => toggleNeedCode(option.value)} className="mt-1 accent-[#FF5F72]" />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {step === 5 && (
        <div>
          <label htmlFor="intake-context" className="block text-base font-semibold text-slate-950">Souhaitez-vous ajouter un peu de contexte ?</label>
          <p className="mt-2 text-xs leading-5 text-slate-500">Facultatif. Décrivez brièvement ce qui vous aiderait. N’indiquez pas de dossier médical, médicaments ou dosages, numéro AVS ou d’assurance. Aucun document ne doit être envoyé.</p>
          <textarea id="intake-context" value={formData.contextSummary} onChange={(e) => updateField("contextSummary", e.target.value)} rows={5} maxLength={1000} placeholder="Quelques phrases suffisent." className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-[#FF5F72] focus:ring-4 focus:ring-[#FFD8D4]" />
          <p className="mt-2 text-right text-xs text-slate-400">{formData.contextSummary.length}/1 000</p>
        </div>
      )}

      {step === 6 && (
        <div>
          <h4 className="text-base font-semibold text-slate-950">Comment Lia peut-elle vous répondre ?</h4>
          <p className="mt-2 text-sm leading-6 text-slate-600">Vos coordonnées restent privées et ne sont pas transmises à un prestataire à cette étape.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <input value={formData.firstName} onChange={(e) => updateField("firstName", e.target.value)} placeholder="Prénom" maxLength={100} autoComplete="given-name" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-[#FF5F72] focus:ring-4 focus:ring-[#FFD8D4]" />
            <input value={formData.lastName} onChange={(e) => updateField("lastName", e.target.value)} placeholder="Nom" maxLength={100} autoComplete="family-name" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-[#FF5F72] focus:ring-4 focus:ring-[#FFD8D4]" />
            <input type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} placeholder="Adresse e-mail" maxLength={320} autoComplete="email" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-[#FF5F72] focus:ring-4 focus:ring-[#FFD8D4]" />
            <input type="tel" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="Téléphone (facultatif)" maxLength={40} autoComplete="tel" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-[#FF5F72] focus:ring-4 focus:ring-[#FFD8D4]" />
          </div>
          <fieldset className="mt-5">
            <legend className="text-sm font-semibold text-slate-800">Comment préférez-vous être contacté ?</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {CONTACT_METHOD_OPTIONS.map((option) => (
                <label key={option.value} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm ${formData.preferredContactMethod === option.value ? "border-[#FF5F72] bg-[#FFF0EF] text-[#10213D]" : "border-slate-200 text-slate-700"}`}>
                  <input type="radio" name="preferred-contact-method" value={option.value} checked={formData.preferredContactMethod === option.value} onChange={() => updateField("preferredContactMethod", option.value)} className="accent-[#FF5F72]" />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          {formData.preferredContactMethod === "phone" && !formData.phone.trim() && (
            <p className="mt-3 text-xs leading-5 text-amber-700">Un numéro est nécessaire si vous choisissez le téléphone.</p>
          )}
        </div>
      )}

      {step === 7 && (
        <div>
          <h4 className="text-base font-semibold text-slate-950">Confidentialité et contact</h4>
          <p className="mt-2 text-sm leading-6 text-slate-600">Ces deux confirmations concernent uniquement le traitement de votre demande par Lia. Elles n’autorisent aucun partage avec un prestataire.</p>
          <div className="mt-4 space-y-3">
            <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
              <input type="checkbox" checked={formData.privacyAcknowledged} onChange={(e) => updateField("privacyAcknowledged", e.target.checked)} className="mt-1 accent-[#FF5F72]" />
              <span>J’ai pris connaissance de la <a href="/politique-de-confidentialite" className="font-semibold text-[#10213D] underline underline-offset-4">politique de confidentialité</a> et des informations sur le traitement de cette demande.</span>
            </label>
            <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
              <input type="checkbox" checked={formData.consentContact} onChange={(e) => updateField("consentContact", e.target.checked)} className="mt-1 accent-[#FF5F72]" />
              <span>J’autorise Lia à me contacter au sujet de cette demande.</span>
            </label>
          </div>
        </div>
      )}
{submitError && (
  <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert" aria-live="polite">
    {submitError}
  </p>
)}
      <div className="mt-6 flex items-center justify-between gap-4">
        <button type="button" onClick={back} disabled={step === 0 || isSubmitting} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40">
          Retour
        </button>
        {step < totalSteps - 1 ? (
          <button type="button" onClick={next} disabled={isSubmitting} className="ml-auto flex items-center justify-center gap-2 rounded-2xl bg-[#FF5F72] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition hover:bg-[#E64B60] disabled:cursor-not-allowed disabled:opacity-60">
            Continuer <ArrowRight className="text-base" />
          </button>
        ) : (
          <button type="submit" disabled={isSubmitting} className="ml-auto flex items-center justify-center gap-2 rounded-xl bg-[#FF5F72] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#E64B60] disabled:cursor-wait disabled:opacity-60">
            {isSubmitting ? "Envoi en cours..." : "Préparer ma sélection personnalisée"} <ArrowRight className="text-base" />
          </button>
        )}
      </div>

      <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <Shield className="text-[#FF5F72]" />
        Sans engagement. Données confidentielles.
      </p>
    </form>
  );
}
function FAQItem({ item, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[#F0DED8] bg-white transition hover:border-[#FFB9C1]">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-6 px-6 py-6 text-left sm:px-7"
      >
        <span className="text-base font-semibold leading-6 text-[#10213D] sm:text-lg">
          {item.q}
        </span>

        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition duration-300 ${
            isOpen
              ? "bg-[#FF5F72] text-white"
              : "bg-[#FFF0EF] text-[#E64B60]"
          }`}
        >
          <ChevronDown
            size={20}
            strokeWidth={1.8}
            className={`transition-transform duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </span>
      </button>

      <div
        className={`grid transition-all duration-300 ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <p className="border-t border-[#F3E3DE] px-6 py-6 text-sm leading-7 text-slate-600 sm:px-7">
            {item.a}
          </p>
        </div>
      </div>
    </div>
  );
}
export default function LiaVaudLandingPage() {
  const [marketplaceType, setMarketplaceType] = useState("ems");
  const [marketplaceQuery, setMarketplaceQuery] = useState("");

  const handleMarketplaceSearch = (event) => {
    event.preventDefault();

    const params = new URLSearchParams();
    params.set("type", marketplaceType);

    const query = marketplaceQuery.trim();

    if (query) {
      params.set("query", query);
    }

    window.location.href = `/recherche?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-[#fcfbf8] text-slate-900">
      <Header active="recherche" home />

      <main>
        {/* MARKETPLACE HERO */}
<section className="border-b border-[#F2DDE1] bg-[#FFF0F4]">
  <div className="mx-auto max-w-7xl px-5 pb-12 pt-14 text-center lg:px-8 lg:pb-16 lg:pt-16">
    <div className="inline-flex items-center gap-2 rounded-full bg-white/75 px-5 py-2.5 text-sm font-semibold text-[#E64B60] ring-1 ring-[#F3D8DE]">
      <ShieldCheck size={17} strokeWidth={1.8} />
      Gratuit pour les familles · Canton de Vaud
    </div>

    <h1 className="mx-auto mt-7 max-w-4xl font-serif text-5xl font-semibold leading-[1.05] tracking-[-0.035em] text-[#10213D] sm:text-6xl lg:text-[68px]">
      Trouvez la bonne solution
      <br />
      pour un proche âgé
    </h1>

    <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[#40506A] sm:text-lg">
      Explorez les EMS, services d’aide à domicile et résidences seniors
      dans le canton de Vaud — ou laissez Lia vous accompagner dans votre
      recherche.
    </p>

    {/* CATEGORY SELECTOR */}
    <div className="mx-auto mt-9 grid max-w-2xl grid-cols-3 gap-2">
      {[
        {
          id: "ems",
          label: "EMS",
          symbol: "▦",
        },
        {
          id: "domicile",
          label: "Aide à domicile",
          symbol: "⌂",
        },
        {
          id: "residence",
          label: "Résidences seniors",
          symbol: "◎",
        },
      ].map((item) => {
        const active = marketplaceType === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setMarketplaceType(item.id)}
            className={`flex min-h-[78px] flex-col items-center justify-center gap-1 rounded-xl border px-3 py-3 transition sm:flex-row sm:gap-3 ${
              active
                ? "border-[#FF7A87] bg-white text-[#10213D] shadow-sm"
                : "border-[#F1DDE1] bg-white/55 text-slate-600 hover:bg-white"
            }`}
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${
                active
                  ? "bg-[#FFF0EF] text-[#FF5F72]"
                  : "bg-white text-[#7A8495]"
              }`}
            >
              {item.symbol}
            </span>

            <span className="text-xs font-bold sm:text-sm">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>

    {/* SEARCH */}
    <form
      onSubmit={handleMarketplaceSearch}
      className="mx-auto mt-3 max-w-5xl rounded-2xl bg-white p-2 shadow-xl shadow-rose-200/25 ring-1 ring-[#EFDDE0]"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={20}
            strokeWidth={1.8}
            className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={marketplaceQuery}
            onChange={(event) => setMarketplaceQuery(event.target.value)}
            placeholder="Rechercher par commune, NPA ou nom du prestataire"
            className="h-16 w-full rounded-xl border-0 bg-white pl-14 pr-5 text-base text-[#10213D] outline-none placeholder:text-slate-400"
          />
        </div>

        <button
          type="submit"
          className="inline-flex h-16 shrink-0 items-center justify-center gap-3 rounded-xl bg-[#10213D] px-9 text-sm font-bold text-white transition hover:bg-[#19345C]"
        >
          <Search size={18} strokeWidth={2} />
          Rechercher
        </button>
      </div>
    </form>

    <div className="mt-6">
      <span className="text-sm text-slate-600">
        Vous ne savez pas quelle solution choisir ?{" "}
      </span>

      <a
        href="#form"
        className="text-sm font-bold text-[#E64B60] underline decoration-[#FF9AA6] decoration-2 underline-offset-4"
      >
        Recevoir ma sélection personnalisée →
      </a>
    </div>
  </div>

  {/* TRUST STRIP */}
  <div className="border-t border-[#F0DADD] bg-[#FFE4EC]">
    <div className="mx-auto grid max-w-7xl gap-0 px-5 sm:grid-cols-3 lg:px-8">
      {[
        {
          symbol: "♡",
          title: "Gratuit pour les familles",
          text: "Explorez les solutions sans frais.",
        },
        {
          symbol: "✓",
          title: "Informations transparentes",
          text: "Données issues de sources publiques.",
        },
        {
          symbol: "♧",
          title: "Accompagnement humain",
          text: "Lia vous aide si la recherche devient complexe.",
        },
      ].map((item, index) => (
        <div
          key={item.title}
          className={`flex items-center gap-4 px-3 py-6 text-left sm:px-6 ${
            index < 2 ? "sm:border-r sm:border-[#F2C9D2]" : ""
          }`}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/75 text-xl text-[#FF5F72]">
            {item.symbol}
          </div>

          <div>
            <h3 className="text-sm font-bold text-[#10213D]">
              {item.title}
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-600">
              {item.text}
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>
</section>

{/* THREE MAIN CATEGORIES */}
<section className="bg-white">
  <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
    <div className="grid gap-4 md:grid-cols-3">
      {[
        {
          type: "ems",
          label: "EMS",
          text: "Établissements médico-sociaux",
        },
        {
          type: "domicile",
          label: "Aide à domicile",
          text: "Soins et accompagnement chez soi",
        },
        {
          type: "residence",
          label: "Résidences seniors",
          text: "Logements adaptés et vie autonome",
        },
      ].map((item) => (
        <a
          key={item.type}
          href={`/recherche?type=${item.type}`}
          className="group flex items-center justify-between rounded-xl border border-[#E8E2DF] bg-white px-6 py-5 transition hover:border-[#FF9EAA] hover:shadow-md"
        >
          <div>
            <h3 className="font-bold text-[#10213D]">
              {item.label}
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              {item.text}
            </p>
          </div>

          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF0EF] font-bold text-[#E64B60] transition group-hover:bg-[#FF5F72] group-hover:text-white">
            →
          </span>
        </a>
      ))}
    </div>
  </div>
</section>

{/* SUPPORT PATHS */}
<section className="bg-white">
  <div className="mx-auto grid max-w-7xl gap-6 px-5 pb-16 pt-3 lg:grid-cols-2 lg:px-8">
    {/* URGENT */}
    <a
      href="#form"
      className="group relative overflow-hidden rounded-[2rem] bg-[#FFF0D8] p-8 transition hover:-translate-y-1 hover:shadow-xl lg:p-10"
    >
      <div className="relative z-10 max-w-lg">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#E64B60] shadow-sm">
          <Clock3 size={23} strokeWidth={1.8} />
        </div>

        <h2 className="mt-6 font-serif text-3xl font-semibold text-[#10213D]">
          Besoin d’une solution rapidement ?
        </h2>

        <p className="mt-4 text-sm leading-7 text-slate-700">
          Sortie d’hôpital, chute récente ou situation devenue difficile :
          Lia traite les situations pressantes en priorité.
        </p>

        <div className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#10213D] px-5 py-3 text-sm font-bold text-white">
          Demander une orientation rapide
          <ArrowRight />
        </div>
      </div>
    </a>

    {/* PERSONALISED SHORTLIST */}
    <a
      href="#form"
      className="group relative min-h-[330px] overflow-hidden rounded-[2rem] bg-[#DFF6EF] transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="absolute right-0 top-0 h-full w-[48%]">
        <img
          src="/hero-lia.png"
          alt=""
          className="h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#DFF6EF] via-[#DFF6EF]/30 to-transparent" />
      </div>

      <div className="relative z-10 max-w-[60%] p-8 lg:p-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#E64B60] shadow-sm">
          <HeartHandshake size={24} strokeWidth={1.8} />
        </div>

        <h2 className="mt-6 font-serif text-3xl font-semibold text-[#10213D]">
          Recevez une sélection personnalisée
        </h2>

        <p className="mt-4 text-sm leading-7 text-slate-700">
          Décrivez la situation de votre proche et Lia vous aide à identifier
          les options les plus pertinentes.
        </p>

        <div className="mt-7 inline-flex items-center gap-2 font-bold text-[#10213D]">
          Recevoir ma sélection
          <ArrowRight />
        </div>
      </div>
    </a>
  </div>
</section>
<section
  id="how"
  className="relative overflow-hidden border-b border-[#F3E3DE] bg-[#FFF4EF]"
>
  <div className="absolute -right-24 top-10 h-80 w-80 rounded-full bg-[#FFD8D4]/50 blur-3xl" />
  <div className="absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-white/70 blur-3xl" />

  <div className="relative mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#E64B60]">
        Simple et humain
      </p>

      <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight text-[#10213D] sm:text-5xl">
        Comment ça marche
      </h2>

      <div className="mx-auto mt-3 h-1.5 w-16 rounded-full bg-[#FF7A87]" />

      <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600">
        Lia vous accompagne étape par étape afin de rendre une situation
        souvent complexe plus claire et plus rassurante.
      </p>
    </div>

    <div className="relative mt-14">
      <div className="absolute left-[12%] right-[12%] top-12 hidden border-t-2 border-dashed border-[#FF9AA6] lg:block" />

      <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => {
          const StepIcon = step.Icon;

          return (
            <div key={step.n} className="relative text-center">
              <div className="relative z-10 mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-[#FFF9F6] text-[#10213D] shadow-lg shadow-rose-100/70 ring-1 ring-[#F1DDD7]">
                <StepIcon size={35} strokeWidth={1.7} />
              </div>

              <div className="relative z-20 mx-auto -mt-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#FF5F72] text-sm font-bold text-white shadow-md shadow-rose-200">
                {step.n}
              </div>

              <h3 className="mx-auto mt-6 max-w-[230px] text-lg font-semibold leading-6 text-[#10213D]">
                {step.title}
              </h3>

              <p className="mx-auto mt-3 max-w-[250px] text-sm leading-6 text-slate-600">
                {step.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  </div>
</section>
<section id="form" className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
  <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
    <div>
      <h2 className="font-serif text-4xl font-semibold leading-tight text-[#10213D] sm:text-5xl">
  Recevez une sélection adaptée à votre proche.
</h2>
      <div className="mt-2 h-2 w-56 rounded-full bg-[#FF7A87]" />

      <p className="mt-8 max-w-xl text-lg leading-8 text-[#10213D]">
  Décrivez-nous la situation de votre proche. Lia analyse ses besoins et vous prépare gratuitement une première sélection de solutions pertinentes dans le canton de Vaud.
</p>

      <div className="mt-8 flex flex-wrap gap-3">
        {["Sans engagement", "Réponse rapide", "Service gratuit"].map((item) => (
          <span key={item} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#10213D] shadow-sm ring-1 ring-[#F1DDD7]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF5F72] text-xs text-white">✓</span>
            {item}
          </span>
        ))}
      </div>

      <div className="mt-10 max-w-lg rounded-[2rem] bg-[#FFE1DE] p-8 text-[#10213D]">
        <div className="text-5xl leading-none text-[#FF5F72]">“</div>
        <p className="mt-2 text-base leading-8">
          Lia nous a vraiment aidés à y voir plus clair à un moment où on avait tellement besoin.
        </p>
        <p className="mt-5 text-sm font-semibold">— Famille, Lausanne</p>
        <div className="mt-4 text-right text-2xl text-[#FF5F72]">♡</div>
      </div>
    </div>

    <HeroForm />
  </div>
</section>

        <section
  id="services"
  className="border-y border-[#F3E3DE] bg-[#FFF9F6]"
>
  <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#E64B60]">
        Situations spécifiques
      </p>

      <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight text-[#10213D] sm:text-5xl">
        Des besoins qui demandent une attention particulière
      </h2>

      <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600">
  Certaines situations nécessitent une recherche plus précise. Lia vous aide
  à comprendre les options possibles et à identifier les bons interlocuteurs.
</p>
    </div>

    <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {serviceCards.map((card) => (
        <a
          key={card.title}
          href={card.href}
          className="group flex min-h-[330px] flex-col rounded-[2rem] border border-[#F0DED8] bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#FFB9C1] hover:shadow-xl hover:shadow-rose-100/60"
        >
          <div className="flex items-start justify-between gap-5">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.4rem] text-[27px] ${card.color}`}
            >
              {card.symbol}
            </div>

            <span className="rounded-full bg-[#FFF8F3] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E64B60]">
              Guide Lia
            </span>
          </div>

          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {card.eyebrow}
          </p>

          <h3 className="mt-3 font-serif text-2xl font-semibold leading-tight text-[#10213D]">
            {card.title}
          </h3>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            {card.text}
          </p>

          <div className="mt-auto flex items-center justify-between pt-8">
            <span className="text-sm font-semibold text-[#E64B60]">
              Être guidé
            </span>

            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF0EF] text-lg text-[#E64B60] transition duration-300 group-hover:translate-x-1 group-hover:bg-[#FF5F72] group-hover:text-white">
              →
            </span>
          </div>
        </a>
      ))}
    </div>
  </div>
</section>

        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
  <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#E64B60]">
        Explorer Lia
      </p>

      <h2 className="mt-3 font-serif text-4xl font-semibold leading-tight text-[#10213D] sm:text-5xl">
        Découvrez quelques solutions dans le canton de Vaud
      </h2>

      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
        Parcourez les établissements et services présents sur Lia, puis affinez votre recherche selon la région et le type d’accompagnement.
      </p>
    </div>

    <a
      href="/recherche"
      className="inline-flex shrink-0 items-center justify-center gap-3 rounded-full bg-[#10213D] px-7 py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#19345C]"
    >
      Explorer toutes les solutions
      <ArrowRight />
    </a>
  </div>

  <div className="mt-10 grid gap-6 md:grid-cols-3">
    {providerExamples.map((provider) => (
      <article
        key={provider.name}
        className="group overflow-hidden rounded-[2rem] border border-[#F0DED8] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#FFB9C1] hover:shadow-xl hover:shadow-rose-100/50"
      >
        <div
          className={`flex h-36 items-center justify-center ${provider.tone}`}
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/80 text-4xl shadow-sm">
            {provider.icon}
          </div>
        </div>

        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E64B60]">
            {provider.category} · {provider.location}
          </p>

          <h3 className="mt-3 text-xl font-semibold leading-7 text-[#10213D]">
            {provider.name}
          </h3>

          <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
            <MapPin size={15} strokeWidth={1.8} className="text-[#FF7A87]" />
            {provider.area}
          </p>

          <div className="mt-6 border-t border-[#F0E7E3] pt-5">
            <a
              href={`/recherche?type=${provider.type}&query=${encodeURIComponent(
                provider.name
              )}`}
              className="flex items-center justify-between text-sm font-semibold text-[#10213D] transition group-hover:text-[#E64B60]"
            >
              Voir cette solution

              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF0EF] text-[#E64B60] transition group-hover:bg-[#FF5F72] group-hover:text-white">
                →
              </span>
            </a>
          </div>
        </div>
      </article>
    ))}
  </div>

  <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#FFF8F3] p-5 text-xs leading-6 text-slate-500">
    <ShieldCheck
      size={18}
      strokeWidth={1.8}
      className="mt-0.5 shrink-0 text-[#E64B60]"
    />

    <p>
      Les informations présentées sont indicatives et issues de sources
      publiques. Les prestations, conditions et disponibilités doivent être
      confirmées auprès des organismes concernés.
    </p>
  </div>
</section>

        

        <section id="guide" className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#E64B60]">Comprendre les options</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#163168] sm:text-4xl">
              Soins, accompagnement et financement
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Trouver une solution ne se limite pas à choisir un prestataire. Les familles doivent aussi comprendre les coûts, les aides possibles et les démarches à entreprendre.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {guideCards.map((card) => (
              <div key={card.title} className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f1f7f3] text-2xl font-semibold text-[#E64B60]">
                  {card.symbol}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-[#153168]">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{card.text}</p>
                <div className="mt-5 text-sm font-semibold text-[#E64B60]">Lire le guide →</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-8 pt-14 lg:px-8">
  <div className="relative overflow-hidden rounded-[2.5rem] border border-[#F2DAD4] bg-[#FFF0EF] px-7 py-10 sm:px-10 lg:px-14 lg:py-14">
    <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#FFD8D4]/60 blur-3xl" />
    <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-white/70 blur-3xl" />

    <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#E64B60] ring-1 ring-[#F1DDD7]">
          <HeartHandshake size={17} strokeWidth={1.8} />
          Lia se construit avec vous
        </div>

        <h2 className="mt-6 max-w-2xl font-serif text-4xl font-semibold leading-tight text-[#10213D] sm:text-5xl">
          Chaque famille mérite d’être accompagnée.
        </h2>

        <p className="mt-5 max-w-2xl text-base leading-8 text-slate-700">
          Lia accompagne ses premières familles dans le canton de Vaud afin
          de construire un service réellement utile, humain et adapté aux
          situations vécues.
        </p>

        <a
          href="#form"
          className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#FF5F72] px-8 py-4 text-base font-bold text-white shadow-xl shadow-rose-200 transition hover:-translate-y-0.5 hover:bg-[#E64B60]"
        >
          Recevoir ma sélection
          <ArrowRight />
        </a>
      </div>

      <div className="rounded-[2rem] bg-white/85 p-7 shadow-lg shadow-rose-100/50 ring-1 ring-white backdrop-blur">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFE1DE] text-[#E64B60]">
          <HeartHandshake size={27} strokeWidth={1.7} />
        </div>

        <h3 className="mt-5 text-xl font-semibold text-[#10213D]">
          Un accompagnement humain
        </h3>

        <p className="mt-3 text-sm leading-7 text-slate-600">
          Nous prenons le temps de comprendre votre situation avant de vous
          aider à clarifier les prochaines étapes.
        </p>

        <div className="mt-6 border-t border-[#F1DDD7] pt-5">
          <p className="text-xs leading-6 text-slate-500">
            <strong className="text-[#10213D]">Important :</strong> Lia n’est
            pas un prestataire médical, ne garantit pas de place en EMS et ne
            remplace pas l’avis d’un professionnel de santé.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>

        <section className="mx-auto max-w-7xl px-5 pb-8 pt-16 lg:px-8 lg:pt-20">
  <div className="mx-auto max-w-3xl text-center">
    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#E64B60]">
      Vos questions
    </p>

    <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight text-[#10213D] sm:text-5xl">
      Questions fréquentes
    </h2>

    <div className="mx-auto mt-3 h-1.5 w-16 rounded-full bg-[#FF7A87]" />

    <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600">
      Les réponses aux premières questions que les familles se posent
      lorsqu’un proche commence à avoir besoin d’aide.
    </p>
  </div>

  <div className="mx-auto mt-12 max-w-4xl space-y-4">
    {faqs.map((item, index) => (
      <FAQItem
        key={item.q}
        item={item}
        defaultOpen={index === 0}
      />
    ))}
  </div>
</section>

        <Footer ctaHref="#form" />

      </main>
    </div>
  );
}
