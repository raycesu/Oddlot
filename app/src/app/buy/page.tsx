import { redirect } from "next/navigation"

const BuyRedirect = () => {
  redirect("/trade?side=call")
}

export default BuyRedirect
