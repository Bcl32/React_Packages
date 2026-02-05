import * as React from "react";

import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

import { useDatabaseMutation } from "@bcl32/hooks/useDatabaseMutation";
import { Button } from "@bcl32/utils/Button";

import { FormElement, type EntryData, type FormData } from "./FormElement";

interface ModelAttribute extends EntryData {
  default: unknown;
}

interface ModelData {
  model_attributes: ModelAttribute[];
  update_api_url: string;
}

interface ObjData extends FormData {
  id: string | number;
}

interface EditModelFormProps {
  ModelData: ModelData;
  query_invalidation: string[];
  obj_data: ObjData;
  processing_function?: () => void;
}

export function EditModelForm({
  ModelData,
  query_invalidation,
  obj_data,
  ...props
}: EditModelFormProps) {
  const [formData, setFormData] = React.useState<FormData>(obj_data);

  function change_datetime(value: Dayjs | null, name: string) {
    setFormData((prevFormData) => {
      return {
        ...prevFormData,
        [name]: value,
      };
    });

    const element = document.getElementById("input_" + name);
    if (element && value) {
      element.innerText = value.format("MMM, D YYYY - h:mma");
    }
  }

  async function update_entry() {
    props.processing_function?.();
    await mutation_update_entry.mutate();
  }

  const mutation_update_entry = useDatabaseMutation(
    ModelData.update_api_url + "?id=" + obj_data.id,
    formData,
    query_invalidation
  );

  return (
    <div className="space-y-6">
      <form className="space-y-3">
        {ModelData.model_attributes.map((entry) => {
          if (entry.editable) {
            return (
              <FormElement
                key={entry.name}
                entry_data={entry}
                change_datetime={change_datetime}
                formData={formData}
                setFormData={setFormData}
              />
            );
          } else {
            return null;
          }
        })}
      </form>

      <div className="pt-2 border-t">
        <Button variant="default" onClick={update_entry}>
          Update
        </Button>

        {mutation_update_entry.isPending && (
          <p className="text-sm text-muted-foreground mt-2">Editing Entry...</p>
        )}
        {mutation_update_entry.isError && (
          <div className="text-sm text-red-600 mt-2">
            An error occurred: {mutation_update_entry.error?.message}
          </div>
        )}
        {mutation_update_entry.isSuccess && (
          <div className="text-sm text-green-600 mt-2">Entry Edited!</div>
        )}
      </div>
    </div>
  );
}
