import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ToneForm } from "./AddToneForm";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Settings {
  openai_model: string;
  custom_prompts: {
    [key: string]: string;
  };
  prompt_order: string[];
  selected_tone?: string;
}

interface PromptSettingsProps {
  settings: Settings;
  setSettings: (settings: Settings) => void;
}

interface SortablePromptItemProps {
  name: string;
  prompt: string;
  isSelected: boolean;
  onSelect: (name: string) => void;
  onEdit: (name: string) => void;
  onDelete: (name: string) => void;
  isDeletable: boolean;
  isDragOverlay?: boolean;
}

function SortablePromptItem({
  name,
  prompt,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  isDeletable,
  isDragOverlay = false,
}: SortablePromptItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: name,
    data: {
      type: 'prompt',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragOverlay ? undefined : transition,
  };

  // Simplified styling during drag to improve performance
  const dragClass = isDragging ? 'opacity-40 scale-105' : '';
  const overlayClass = isDragOverlay ? 'rotate-2 shadow-2xl z-50' : '';

  const handleMainClick = (e: React.MouseEvent) => {
    // Only handle clicks that didn't originate from the drag handle
    const target = e.target as HTMLElement;
    const isDragHandleClick = target.closest('[data-drag-handle]');
    
    if (!isDragHandleClick && !isDragOverlay) {
      onSelect(name);
    }
  };

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={style}
      className={`flex flex-col p-4 mb-4 border rounded-lg transition-all duration-200 ${
        isSelected 
          ? 'border-accent-primary bg-accent-primary/5 shadow-sm' 
          : 'border-border-primary bg-background-secondary'
      } ${dragClass} ${overlayClass} ${
        isDragOverlay ? '' : 'hover:border-border-secondary hover:shadow-sm cursor-pointer'
      }`}
      onClick={handleMainClick}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          {/* Drag handle */}
          <div
            data-drag-handle
            {...(isDragOverlay ? {} : attributes)}
            {...(isDragOverlay ? {} : listeners)}
            className="flex flex-col gap-0.5 cursor-grab active:cursor-grabbing p-2 hover:bg-background-tertiary rounded transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-0.5">
              <div className="w-0.5 h-0.5 rounded-full bg-text-secondary"></div>
              <div className="w-0.5 h-0.5 rounded-full bg-text-secondary"></div>
            </div>
            <div className="flex gap-0.5">
              <div className="w-0.5 h-0.5 rounded-full bg-text-secondary"></div>
              <div className="w-0.5 h-0.5 rounded-full bg-text-secondary"></div>
            </div>
            <div className="flex gap-0.5">
              <div className="w-0.5 h-0.5 rounded-full bg-text-secondary"></div>
              <div className="w-0.5 h-0.5 rounded-full bg-text-secondary"></div>
            </div>
          </div>
          <span className={`text-base select-none ${
            isSelected ? 'text-accent-primary' : 'text-text-primary'
          }`}>{name}</span>
        </div>
        {!isDragOverlay && (
          <div className="flex gap-2 items-center">
            {isSelected && (
              <svg className="w-5 h-5 text-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
            <button
              className="p-1 rounded-md border-0 bg-transparent cursor-pointer flex items-center justify-center transition-all duration-200 hover:bg-background-tertiary"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(name);
              }}
            >
              <svg className="w-5 h-5 text-text-secondary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </button>
            {isDeletable && (
              <button
                className="p-1 rounded-md border-0 bg-transparent cursor-pointer flex items-center justify-center transition-all duration-200 hover:bg-red-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(name);
                }}
              >
                <svg className="w-5 h-5 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
      <div className={`text-sm whitespace-pre-wrap mt-2 select-none ${
        isSelected ? 'text-accent-primary' : 'text-text-secondary'
      }`}>{prompt}</div>
    </div>
  );
}

export function PromptSettings({ settings, setSettings }: PromptSettingsProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTone, setEditingTone] = useState<{ name: string; prompt: string } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSelectTone = async (toneName: string) => {
    try {
      const updatedSettings = {
        ...settings,
        selected_tone: toneName,
      };
      await invoke("save_settings", { settings: updatedSettings });
      setSettings(updatedSettings);
    } catch (error) {
      console.error("Failed to save selected tone:", error);
    }
  };

  const handleSaveTone = async (name: string, prompt: string) => {
    try {
      const updatedPromptOrder = editingTone 
        ? settings.prompt_order // Keep existing order when editing
        : [...settings.prompt_order, name]; // Add new tone to the end

      const updatedSettings = {
        ...settings,
        custom_prompts: {
          ...settings.custom_prompts,
          [name]: prompt,
        },
        prompt_order: updatedPromptOrder,
        selected_tone: settings.selected_tone || name, // Only set if none selected
      };
      await invoke("save_settings", { settings: updatedSettings });
      setSettings(updatedSettings);
      setIsFormOpen(false);
      setEditingTone(null);
    } catch (error) {
      console.error("Failed to save tone:", error);
    }
  };

  const handleDeleteTone = async (toneName: string) => {
    // Prevent deletion of default "Improve Writing" tone
    if (toneName === "Improve Writing") return;

    try {
      const { [toneName]: _, ...remainingPrompts } = settings.custom_prompts;
      const updatedOrder = settings.prompt_order.filter(name => name !== toneName);
      const updatedSettings = {
        ...settings,
        custom_prompts: remainingPrompts,
        prompt_order: updatedOrder,
        selected_tone: settings.selected_tone === toneName ? "Improve Writing" : settings.selected_tone,
      };
      await invoke("save_settings", { settings: updatedSettings });
      setSettings(updatedSettings);
    } catch (error) {
      console.error("Failed to delete tone:", error);
    }
  };

  const handleEdit = (name: string) => {
    setEditingTone({
      name,
      prompt: settings.custom_prompts[name]
    });
    setIsFormOpen(true);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const orderedPrompts = getOrderedPrompts();
      const oldIndex = orderedPrompts.indexOf(active.id as string);
      const newIndex = orderedPrompts.indexOf(over.id as string);
      
      const newOrder = arrayMove(orderedPrompts, oldIndex, newIndex);

      const updatedSettings = {
        ...settings,
        prompt_order: newOrder,
      };

      // Update state immediately for UI responsiveness
      setSettings(updatedSettings);

      try {
        await invoke("save_settings", { settings: updatedSettings });
      } catch (error) {
        console.error("Failed to save prompt order:", error);
        // Revert state on error
        setSettings(settings);
      }
    }

    setActiveId(null);
  };

  // Get ordered prompts based on prompt_order, fallback to existing prompts if order is missing
  const getOrderedPrompts = () => {
    const existingPrompts = Object.keys(settings.custom_prompts);
    
    // If no prompt_order exists or it's empty, return existing prompts with "Improve Writing" first
    if (!settings.prompt_order || settings.prompt_order.length === 0) {
      const improveWritingFirst = existingPrompts.includes("Improve Writing") 
        ? ["Improve Writing", ...existingPrompts.filter(name => name !== "Improve Writing")]
        : existingPrompts;
      return improveWritingFirst;
    }
    
    // Use existing order but include any new prompts that aren't in the order yet
    const orderedPrompts = settings.prompt_order.filter(name => existingPrompts.includes(name));
    const unorderedPrompts = existingPrompts.filter(name => !settings.prompt_order.includes(name));
    const result = [...orderedPrompts, ...unorderedPrompts];
    return result;
  };

  const orderedPrompts = getOrderedPrompts();

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* Dynamic header based on current view */}
      <div>
        <div className="mb-2">
          <h1 className="text-2xl text-text-primary">
            {isFormOpen 
              ? (editingTone ? `Edit ${editingTone.name}` : 'Add New Tone')
              : 'Custom Prompts'
            }
          </h1>
        </div>
        <p className="text-sm text-text-secondary mt-1 leading-5">
          {isFormOpen 
            ? (editingTone 
                ? 'Modify the prompt description for this tone' 
                : 'Create a new custom prompt to transform your text in a specific style')
            : 'Create and manage custom prompts to transform your text in different styles. Select a prompt as your default tone or create new ones for different purposes. Drag to reorder.'
          }
        </p>
      </div>

      {/* Content Section */}
      <div className="bg-background-secondary p-6 rounded-lg border border-border-primary">
        {isFormOpen ? (
          <div className="transform transition-all duration-300 ease-in-out animate-in slide-in-from-left-4">
            <ToneForm
              initialName={editingTone?.name}
              initialPrompt={editingTone?.prompt}
              onSave={handleSaveTone}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingTone(null);
              }}
            />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={orderedPrompts} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {orderedPrompts.map((name) => (
                  <SortablePromptItem
                    key={name}
                    name={name}
                    prompt={settings.custom_prompts[name]}
                    isSelected={settings.selected_tone === name}
                    onSelect={handleSelectTone}
                    onEdit={handleEdit}
                    onDelete={handleDeleteTone}
                    isDeletable={name !== "Improve Writing"}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeId ? (
                <SortablePromptItem
                  name={activeId}
                  prompt={settings.custom_prompts[activeId]}
                  isSelected={settings.selected_tone === activeId}
                  onSelect={() => {}}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  isDeletable={activeId !== "Improve Writing"}
                  isDragOverlay={true}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
        
        {!isFormOpen && (
          <button 
            className="flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-border-primary rounded-lg bg-transparent text-text-secondary cursor-pointer transition-all duration-200 hover:border-border-secondary hover:text-text-primary mt-4"
            onClick={() => setIsFormOpen(true)}
          >
            <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add New Tone
          </button>
        )}
      </div>
    </div>
  );
}
