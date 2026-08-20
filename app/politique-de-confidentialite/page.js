import InfoPage from "../components/InfoPage";

export const metadata = {
  title: "Politique de confidentialité | Lia",
  description: "Politique de confidentialité de Lia.",
};

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Informations"
      title="Politique de confidentialité"
      description="Principes de traitement des données transmises à Lia."
      sections={[
        {
          id: "donnees",
          title: "Données traitées",
          paragraphs: [
            "Lorsque vous remplissez un formulaire, Lia traite les informations que vous transmettez afin de comprendre la situation et de préparer une première orientation.",
            "Ces informations peuvent inclure vos coordonnées, la commune concernée, le type de besoin et les détails que vous choisissez de partager.",
          ],
        },
        {
          id: "contact",
          title: "Contact",
          paragraphs: [
            "Pour toute question relative aux données personnelles, vous pouvez écrire à contact@liavaud.ch.",
          ],
        },
      ]}
    />
  );
}
