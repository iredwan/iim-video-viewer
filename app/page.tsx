import Image from 'next/image'
import BatchBrowser from '@/components/BatchBrowser'

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <Image
          src="/assets/logo/logo.png"
          alt="ইক্বরা ইসলামিক আলিম্মদারা"
          width={120}
          height={120}
          className="h-16 w-auto"
        />
        <div>
          <h1 className="text-2xl font-bold">ইক্বরা ইসলামিক মাদরাসা</h1>
          <p className="mt-1 text-sm text-neutral-400">ব্যাচ রেকডিং ক্লাস</p>
        </div>
      </div>
      <div className="pb-2.5 text-xl font-bold">ক্লাস রেকডিং</div>
      <BatchBrowser />
    </main>
  )
}
