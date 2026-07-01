import Nav from "@/components/Nav";
import Intro from "@/components/Intro";
import Simulator from "@/components/Simulator";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <span id="top" />
      <Nav />
      <main>
        <Intro />
        <section className="band">
          <Simulator />
        </section>
      </main>
      <Footer />
    </>
  );
}
