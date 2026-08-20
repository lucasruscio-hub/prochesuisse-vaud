import InfoPage from "../components/InfoPage";

export const metadata = {
  title: "Mentions légales | Lia",
  description: "Mentions légales de Lia.",
};

export default function LegalNoticePage() {
  return (
    <InfoPage
      eyebrow="Informations"
      title="Mentions légales"
      description="Informations générales relatives au site Lia."
      sections={[
        {
          id: "editeur",
          title: "Éditeur du site",
          paragraphs: [
            "Lia est un service d’orientation destiné aux familles recherchant des solutions d’accompagnement pour un proche âgé dans le canton de Vaud.",
            "Contact : contact@liavaud.ch.",
          ],
        },
        {
          id: "responsabilite",
          title: "Responsabilité",
          paragraphs: [
            "Les informations publiées sur Lia sont indicatives. Les prestations, conditions, tarifs et disponibilités doivent être confirmés auprès des organismes concernés.",
            "Lia n’est pas un prestataire médical et ne remplace pas l’avis d’un professionnel de santé, d’un service social ou d’une autorité compétente.",
          ],
        },
      ]}
    />
  );
}
