//THIRD PARTY LIBRARIES
import React, { useState, useEffect, useRef, useMemo } from "react";
//datetime modules
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone"; // dependent on utc plugin
dayjs.extend(utc);
dayjs.extend(timezone);

//my package imports
import { useDatabaseMutation } from "@bcl32/hooks/useDatabaseMutation";
import { Button } from "@bcl32/utils/Button";

//my custom components
import { FormElement } from "./FormElement";

export function EditModelForm({
  ModelData,
  query_invalidation,
  obj_data,
  ...props
}) {
  const [formData, setFormData] = React.useState(obj_data);

  //special formData updater function for datetime as event.target doesn't work with datetimepicker
  function change_datetime(value, name) {
    setFormData((prevFormData) => {
      return {
        ...prevFormData,
        [name]: value,
      };
    });

    document.getElementById("input_" + name).innerText = value.format(
      "MMM, D YYYY - h:mma"
    ); //changes label on datetimepicker to reflect new updated form value
  }

  async function update_entry() {
    props.processing_function?.(); //runs if exists
    let response = await mutation_update_entry.mutate();
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
          if (entry["editable"]) {
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

        {mutation_update_entry.isLoading && (
          <p className="text-sm text-muted-foreground mt-2">Editing Entry...</p>
        )}
        {mutation_update_entry.isError && (
          <div className="text-sm text-red-600 mt-2">
            An error occurred: {mutation_update_entry.error.message}
          </div>
        )}
        {mutation_update_entry.isSuccess && (
          <div className="text-sm text-green-600 mt-2">Entry Edited!</div>
        )}
      </div>
    </div>
  );
}
