"use client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FolderStructureEditor } from "@/components/tabs/misc/FolderStructureEditor";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Schema {
    id: string;
    name: string;
    structure: string;
}

interface FolderStructureEditorProps {
    onSchemaChange: (schema: string) => void;
    initialSchema?: string;
}

export default function ChecklistBank() {
    const [isCreating, setIsCreating] = useState(false);
    const [schema, setSchema] = useState("");
    const [schemaName, setSchemaName] = useState("");
    const [schemas, setSchemas] = useState<Schema[]>([]);

    const handleSaveSchema = () => {
        if (!schemaName.trim() || !schema.trim()) return;
        
        const newSchema: Schema = {
            id: Math.random().toString(36).substr(2, 9),
            name: schemaName.trim(),
            structure: schema
        };

        setSchemas([...schemas, newSchema]);
        setSchema("");
        setSchemaName("");
        setIsCreating(false);
    };

    const handleDeleteSchema = (id: string) => {
        setSchemas(schemas.filter(s => s.id !== id));
    };

    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold">Checklist Bank</h1>
                <Button onClick={() => setIsCreating(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Create Schema
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schemas.map((schema) => (
                    <Card key={schema.id} className="relative overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {schema.name}
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSchema(schema.id)}
                                className="h-8 w-8 p-0"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="absolute inset-0 bg-gradient-to-b from-white to-transparent"></div>
                            <div className="relative z-10">
                                <FolderStructureEditor onSchemaChange={() => {}} initialSchema={schema.structure} isEditable={false}/>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Create Folder Structure Schema</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Schema Name</label>
                            <Input
                                value={schemaName}
                                onChange={(e) => setSchemaName(e.target.value)}
                                placeholder="Enter schema name"
                            />
                        </div>
                        <FolderStructureEditor onSchemaChange={setSchema} />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsCreating(false);
                                setSchema("");
                                setSchemaName("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveSchema}
                            disabled={!schemaName.trim() || !schema.trim()}
                        >
                            Save Schema
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
} 