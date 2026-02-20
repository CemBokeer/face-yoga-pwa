import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-50 px-6 py-10 text-slate-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Face Yoga Coach
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            Gercek zamanli yuz yogasi geri bildirimi
          </h1>
          <p className="mt-4 max-w-2xl text-slate-600">
            Kalibrasyon, canli koçluk ve gecmis takibi tek mobil web akisinda
            birlestirildi. Bu proje MVP asamasinda cihaz ici analiz ve gizlilik
            odakli yaklasim kullanir.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Link
            className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
            href="/onboarding"
          >
            <h2 className="text-lg font-semibold">1. Kalibrasyon</h2>
            <p className="mt-2 text-sm text-slate-600">
              Kamera kalite kontrolu ve kisisel baseline olusturma.
            </p>
          </Link>
          <Link
            className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
            href="/session"
          >
            <h2 className="text-lg font-semibold">2. Canli Seans</h2>
            <p className="mt-2 text-sm text-slate-600">
              Yesil/kirmizi durum, sesli koçluk ve referans video overlay.
            </p>
          </Link>
          <Link
            className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
            href="/history"
          >
            <h2 className="text-lg font-semibold">3. Gecmis</h2>
            <p className="mt-2 text-sm text-slate-600">
              Tamamlanan seanslar ve performans trendi.
            </p>
          </Link>
        </section>
      </main>
    </div>
  );
}
