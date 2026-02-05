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
}

interface AddModelFormProps {
  ModelData: ModelData;
  add_api_url: string;
  query_invalidation: string[];
  processing_function?: () => void;
}

export function AddModelForm(props: AddModelFormProps) {
  const ModelData = props.ModelData;

  const form_defaults: FormData = {};
  ModelData.model_attributes.forEach((item) => {
    form_defaults[item.name] = item.default;
  });

  const [formData, setFormData] = React.useState<FormData>(form_defaults);

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

  async function add_new_entry() {
    props.processing_function?.();
    await mutation_add_entry.mutate();
  }

  const mutation_add_entry = useDatabaseMutation(
    props.add_api_url,
    { payload: formData },
    props.query_invalidation
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
        <Button variant="default" onClick={add_new_entry}>
          Create New
        </Button>

        {mutation_add_entry.isPending && (
          <p className="text-sm text-muted-foreground mt-2">Adding entry...</p>
        )}
        {mutation_add_entry.isError && (
          <div className="text-sm text-red-600 mt-2">
            An error occurred: {mutation_add_entry.error?.message}
          </div>
        )}
        {mutation_add_entry.isSuccess && (
          <div className="text-sm text-green-600 mt-2">Entry Added!</div>
        )}
      </div>
    </div>
  );
}
