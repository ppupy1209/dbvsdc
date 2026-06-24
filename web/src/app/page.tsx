import Nav from "@/components/Nav";
import Toc from "@/components/Toc";
import Intro from "@/components/Intro";
import Simulator from "@/components/Simulator";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <span id="top" />
      <Nav />
      <Toc />
      <main>
        <Intro />
        <Simulator />
      </main>
      <Footer />
    </>
  );
}
