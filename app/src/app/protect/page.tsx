import { redirect } from "next/navigation"

const ProtectRedirect = () => {
  redirect("/trade?side=put")
}

export default ProtectRedirect
