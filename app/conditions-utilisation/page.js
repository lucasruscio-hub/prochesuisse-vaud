import InfoPage from "../components/InfoPage";

export const metadata = {
  title: "Conditions d’utilisation | Lia",
  description: "Conditions d’utilisation de Lia.",
};

export default function TermsPage() {
  return (
    <InfoPage
      eyebrow="Informations"
      title="Conditions d’utilisation"
      description="Conditions générales d’accès et d’utilisation du site Lia."
      sections={[
        {
          id: "service",
          title: "Nature du service",
          paragraphs: [
            "Lia fournit une orientation informative pour aider les familles à comprendre les options disponibles dans le canton de Vaud.",
            "L’utilisation de Lia ne crée pas de relation médicale, juridique ou administrative personnalisée.",
          ],
        },
        {
          id: "contact",
          title: "Contact",
          paragraphs: [
            "Pour toute question concernant l’utilisation du site, vous pouvez écrire à contact@liavaud.ch.",
          ],
        },
      ]}
    />
  );
}
