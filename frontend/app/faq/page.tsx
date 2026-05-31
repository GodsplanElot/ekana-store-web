import { Providers } from "@/components/providers"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export const metadata = {
  title: "FAQ - Ekana Cosmetics",
  description: "Frequently asked questions about Ekana Cosmetics orders and products.",
}

const faqs = [
  {
    question: "What is your delivery timeframe?",
    answer:
      "Orders are typically delivered within 2-5 business days in major cities, with slight variations for other locations.",
  },
  {
    question: "Do you accept returns or exchanges?",
    answer:
      "In keeping with strict hygiene standards, we do not accept returns unless a product arrives damaged, defective, or incorrect.",
  },
  {
    question: "Are Ekana Cosmetics products suitable for sensitive skin?",
    answer:
      "Our formulations are designed with versatility in mind; however, we recommend conducting a patch test to ensure compatibility with your skin.",
  },
]

export default function FaqPage() {
  return (
    <Providers>
      <section className="py-10 lg:py-16">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Help
          </p>
          <h1 className="font-serif text-3xl text-foreground md:text-5xl">
            Frequently Asked Questions
          </h1>
          <Accordion type="single" collapsible className="mt-8">
            {faqs.map((faq) => (
              <AccordionItem key={faq.question} value={faq.question}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </Providers>
  )
}
