import { InfoBlock, InfoPage } from "@/components/info-page"
import { Providers } from "@/components/providers"

export const metadata = {
  title: "About - Ekana Cosmetics",
  description: "Learn about the Ekana Cosmetics standard, story, and values.",
}

export default function AboutPage() {
  return (
    <Providers>
      <InfoPage
        eyebrow="About"
        title="The Ekana Standard"
        intro="At Ekana Cosmetics, appearance is guided by the philosophy of beauty that feels good."
      >
        <InfoBlock title="Beauty That Feels Good">
          <p>
            Each product is created with intention, designed not only to enhance
            appearance but to deliver a luxurious, comfortable experience with
            every wear.
          </p>
          <p>
            Our formulations are designed with versatility in mind; however, we
            recommend conducting a patch test to ensure compatibility with your
            skin.
          </p>
        </InfoBlock>
        <InfoBlock title="Brand Story">
          <p>
            Ekana Cosmetics is built on a commitment to quality and elegance,
            where refined textures, thoughtful shades, and timeless finishes
            create beauty that feels effortless yet sophisticated.
          </p>
          <p>
            Founded by Ekana Elliott, a makeup artist and beauty aficionado from
            Nigeria, the brand reflects discerning taste, detail, and a deep
            appreciation for cosmetics makeup lovers can trust.
          </p>
        </InfoBlock>
        <InfoBlock title="Brand Values">
          <p>Confidence, simplicity, luxury textures, and inclusive beauty.</p>
        </InfoBlock>
      </InfoPage>
    </Providers>
  )
}
