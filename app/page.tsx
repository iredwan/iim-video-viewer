import Image from 'next/image'
import HomeClient from '@/components/HomeClient'

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <Image
          src="/assets/logo/logo.png"
          alt="ইক্বরা ইসলামিক আলিম্মদারা"
          width={120}
          height={120}
          className="h-16 w-auto"
        />
        <div>
          <h1 className="text-3xl font-bold">ইক্বরা ইসলামিক মাদরাসা</h1>
          <p className="mt-1 text-2xl font-semibold text-[#0ffac8]">
            সহীহ শুদ্ধভাবে কুরআন শিক্ষা কোর্স -শুধুমাত্র নারীদের জন্য
            <br />
            <span className="mt-1 block text-lg font-semibold text-cyan-400">
              অনলাইন কুরআন শেখার বিশ্বস্ত প্ল্যাটফর্ম
            </span>
          </p>
        </div>
      </div>

      {/* ?batch= থাকলে ভিডিও দেখাবে, না থাকলে মেসেজ — সম্পূর্ণ ক্লায়েন্ট-সাইডে */}
      <HomeClient />
    </main>
  )
}
