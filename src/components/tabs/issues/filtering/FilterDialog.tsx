import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { LucideIcon } from 'lucide-react'

interface FilterDialogProps {
  title: string
  icon: LucideIcon
  buttonText: string
  items: string[]
  placeholder: string
}

export function FilterDialog({ title, icon: Icon, buttonText, items, placeholder }: FilterDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 flex-1 md:flex-auto">
          <Icon className="h-4 w-4 mr-2" />
          <span>{buttonText}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Filter by {title.toLowerCase()}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Input placeholder={placeholder} className="mb-4" />
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item} className="flex items-center space-x-2">
                <Checkbox id={`${title.toLowerCase()}-${item}`} />
                <label htmlFor={`${title.toLowerCase()}-${item}`} className="text-sm">{item}</label>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}