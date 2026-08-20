import InfoPage from "../components/InfoPage";

export const metadata = {
  title: "Notre mission | Lia",
  description:
    "La mission de Lia : aider les familles à clarifier les solutions d’accompagnement pour un proche âgé dans le canton de Vaud.",
};

export default function MissionPage() {
  return (
    <InfoPage
      eyebrow="À propos de Lia"
      title="Notre mission"
      description="Lia aide les familles à avancer avec plus de clarté lorsqu’un proche âgé a besoin d’un accompagnement."
      sections={[
        {
          id: "mission",
          title: "Une orientation humaine",
          paragraphs: [
            "Lia aide les familles à clarifier les options possibles lorsqu’un proche âgé a besoin d’un cadre de vie, de soins à domicile ou d’un accompagnement temporaire.",
          ],
        },
        {
          id: "comment-ca-marche",
          title: "Comment ça marche",
          paragraphs: [
            "Vous décrivez la situation, Lia identifie les besoins principaux, puis vous aide à explorer des pistes pertinentes dans le canton de Vaud.",
          ],
        },
        {
          id: "questions-frequentes",
          title: "Questions fréquentes",
          paragraphs: [
            "Lia n’est pas un prestataire médical, ne garantit pas de place en EMS et ne remplace pas l’avis d’un professionnel de santé, d’un service social ou d’une autorité compétente.",
          ],
        },
      ]}
    />
  );
}
