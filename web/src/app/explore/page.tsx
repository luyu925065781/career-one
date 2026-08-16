import { permanentRedirect } from "next/navigation";

export default function ExplorePage() {
  permanentRedirect("/profile");
}
