export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
      <p className="text-center text-xs text-gray-400">
        © {new Date().getFullYear()} uchinoko Inc.
      </p>
    </footer>
  )
}
