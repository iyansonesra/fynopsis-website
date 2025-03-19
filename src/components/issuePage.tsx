'use client'

import { useRouter, useParams } from 'next/navigation'
import { IssueDetail } from '@/components/issueDetail'
import Home from "../app/pages/DataroomPage"

export default function IssuePage() {
  const router = useRouter()
  const params = useParams()
  const issueId = parseInt(params?.issueId as string)
  
  const handleBack = () => {
    // Navigate back to the dataroom without the issue detail
    const { id, subId } = params
    router.push(`/dataroom/${id}/${subId}`)
  }
  
  return (
    <div className="relative">
      {/* DataRoom component as background/container */}
      <Home />
      
      {/* Issue detail overlay */}
      <div className="absolute inset-0 bg-white/95 z-10">
        <IssueDetail issueId={issueId} onBack={handleBack} />
      </div>
    </div>
  )
}