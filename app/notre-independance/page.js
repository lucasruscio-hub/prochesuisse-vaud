import InfoPage from "../components/InfoPage";

export const metadata = {
  title: "Notre indépendance | Lia",
  description:
    "Lia aide les familles à comparer les options avec une orientation claire et indépendante.",
};

export default function IndependencePage() {
  return (
    <InfoPage
      eyebrow="À propos de Lia"
      title="Notre indépendance"
      description="Lia présente des informations utiles pour orienter les familles, tout en laissant chaque choix libre."
      sections={[
        {
          id: "independance",
          title: "Une aide à la décision",
          paragraphs: [
            "Lia présente des informations utiles pour orienter les familles. Les choix restent toujours libres et les disponibilités doivent être confirmées auprès des organismes concernés.",
          ],
        },
        {
          id: "limites",
          title: "Les limites de Lia",
          paragraphs: [
            "Lia n’est pas un prestataire médical et ne remplace pas l’avis d’un professionnel de santé, d’un service social ou d’une autorité compétente.",
          ],
        },
      ]}
    />
  );
}
