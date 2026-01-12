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

export function AddModelForm(props) {
  var ModelData = props.ModelData;

  var form_defaults = {};
  ModelData.model_attributes.forEach((item) => {
    form_defaults[item.name] = item.default;
  });

  const [formData, setFormData] = React.useState(form_defaults);

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

  async function add_new_entry() {
    props.processing_function?.(); //runs if exists
    let response = await mutation_add_entry.mutate();
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
        <Button variant="default" onClick={add_new_entry}>
          Create New
        </Button>

        {mutation_add_entry.isLoading && (
          <p className="text-sm text-muted-foreground mt-2">Adding entry...</p>
        )}
        {mutation_add_entry.isError && (
          <div className="text-sm text-red-600 mt-2">
            An error occurred: {mutation_add_entry.error.message}
          </div>
        )}
        {mutation_add_entry.isSuccess && (
          <div className="text-sm text-green-600 mt-2">Entry Added!</div>
        )}
      </div>
    </div>
  );
}
