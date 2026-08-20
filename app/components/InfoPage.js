import Footer from "./Footer";
import Header from "./Header";

export default function InfoPage({ eyebrow, title, description, sections }) {
  return (
    <main className="min-h-screen bg-[#FFF2EF] text-[#10213D]">
      <Header />

      <section className="border-b border-[#F0D7D9] bg-[#FDE7EA]">
        <div className="mx-auto max-w-5xl px-5 py-14 md:px-8 md:py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#E64B60]">
            {eyebrow}
          </p>

          <h1 className="mt-4 font-serif text-[40px] font-semibold leading-[1.1] tracking-tight text-[#10213D] sm:text-5xl md:text-[58px]">
            {title}
          </h1>

          {description && (
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#5D687A]">
              {description}
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-12 md:px-8 md:py-16">
        <div className="space-y-6">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-8 rounded-3xl border border-[#F0D4D6] bg-white p-7 shadow-sm"
            >
              <h2 className="font-serif text-3xl font-semibold text-[#10213D]">
                {section.title}
              </h2>

              <div className="mt-4 space-y-4 text-base leading-8 text-[#5D687A]">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
